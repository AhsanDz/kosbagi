// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title KosLedger
 * @author Kelompok 9 KosBagi
 * @notice Buku besar on-chain satu properti (satu kontrak per KosToken): mencatat
 * setiap pembayaran sewa dan biaya per periode, lalu menutup periode dengan angka
 * distribusi yang bisa diverifikasi siapa pun.
 * @dev Satuan nominal adalah Rupiah utuh, kecuali {PeriodRecord-valuePerTokenSen}
 * yang memakai sen. Kontrak ini tidak memegang uang. Pencairan dan pembagian ke
 * investor terjadi di luar chain memakai angka yang disimpan di sini.
 * Urutan perhitungan saat tutup periode, semua pembagian dibulatkan ke bawah:
 * 1. fee = floor(sewaKotor * platformFeeBps / 10.000)
 * 2. labaKenaPajak = sewaKotor - fee - biaya, bernilai 0 bila hasilnya negatif
 * 3. pajak = floor(labaKenaPajak * taxBps / 10.000)
 * 4. sewaBersih = labaKenaPajak - pajak
 * 5. nilaiPerTokenSen = floor(sewaBersih * 100 / totalSuplai)
 * Bagian tiap pemegang dihitung {shareOf}, bukan dari nilai per token, supaya
 * pembulatan terjadi sekali per pemegang.
 * Data on-chain hanya nomor kamar, periode, nominal, keccak256(order_id), dan hash
 * nota. Tidak ada nama atau data pribadi.
 */
contract KosLedger is AccessControl, Pausable {
    // ---------------------------------------------------------------------
    // Peran (AccessControl). DEFAULT_ADMIN_ROLE dari OpenZeppelin mengatur
    // pemberian dan pencabutan semua peran di bawah.
    // ---------------------------------------------------------------------

    /// @notice Peran dompet operator: mencatat sewa dan biaya, serta menutup periode.
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// @notice Peran jeda darurat: menghentikan dan melanjutkan semua pencatatan.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ---------------------------------------------------------------------
    // Konstanta dan parameter
    // ---------------------------------------------------------------------

    /// @notice Penyebut basis poin (10.000 bp = 100%).
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Jumlah sen dalam satu Rupiah, dipakai untuk nilai per token dua desimal.
    uint256 public constant SEN_PER_RUPIAH = 100;

    /// @dev Periode terkecil yang diterima (Januari 2000). Format periode adalah YYYYMM.
    uint32 private constant MIN_PERIOD = 200_001;

    /// @dev Periode terbesar yang diterima (Desember 9999).
    uint32 private constant MAX_PERIOD = 999_912;

    /// @notice Token properti yang saldonya menjadi dasar bagi hasil.
    IVotes public immutable token;

    /// @notice Fee pengelolaan platform dalam basis poin dari sewa kotor (500 bp = 5%).
    uint256 public immutable platformFeeBps;

    /// @notice Tarif pajak dalam basis poin dari laba kena pajak (2.200 bp = PPh badan 22%).
    uint256 public immutable taxBps;

    /**
     * @notice Keadaan satu periode.
     * @dev `grossRent` dan `totalExpenses` bertambah selama periode terbuka. Field
     * lain baru terisi saat {closePeriod}.
     * @param grossRent Total sewa tercatat, dalam Rupiah.
     * @param totalExpenses Total biaya tercatat, dalam Rupiah.
     * @param platformFee Fee platform, dalam Rupiah.
     * @param tax Pajak, dalam Rupiah.
     * @param netRent Sewa bersih yang dibagikan, dalam Rupiah.
     * @param totalSupply Total suplai token di blok snapshot.
     * @param valuePerTokenSen Sewa bersih per token dalam sen (43875 berarti Rp438,75).
     * @param snapshotBlock Blok acuan saldo pemegang untuk getPastVotes.
     * @param closed true bila periode sudah ditutup.
     */
    struct PeriodRecord {
        uint256 grossRent;
        uint256 totalExpenses;
        uint256 platformFee;
        uint256 tax;
        uint256 netRent;
        uint256 totalSupply;
        uint256 valuePerTokenSen;
        uint256 snapshotBlock;
        bool closed;
    }

    /// @notice Catatan per periode, kunci format YYYYMM (mis. 202611).
    mapping(uint32 period => PeriodRecord) public periods;

    /// @dev Referensi pembayaran (keccak256 order_id RENT-...) yang sudah tercatat.
    mapping(bytes32 paymentRef => bool) private _recordedPaymentRefs;

    /// @dev Hash nota yang sudah tercatat.
    mapping(bytes32 receiptHash => bool) private _recordedReceipts;

    /// @dev Penanda satu kamar sudah tercatat membayar sewa di satu periode.
    mapping(uint32 period => mapping(uint16 room => bool)) private _rentRecorded;

    // ---------------------------------------------------------------------
    // Event
    // ---------------------------------------------------------------------

    /**
     * @notice Satu pembayaran sewa dicatat.
     * @param period Periode YYYYMM.
     * @param room Nomor kamar (3 untuk K03).
     * @param paymentRef Hash referensi pembayaran, keccak256(order_id).
     * @param amount Nominal sewa dalam Rupiah.
     */
    event RentRecorded(uint32 indexed period, uint16 indexed room, bytes32 indexed paymentRef, uint256 amount);

    /**
     * @notice Satu biaya operasional dicatat.
     * @param period Periode YYYYMM.
     * @param category Kode kategori biaya. Daftar kodenya dipegang backend.
     * @param receiptHash Hash file nota.
     * @param amount Nominal biaya dalam Rupiah.
     */
    event ExpenseRecorded(uint32 indexed period, uint8 indexed category, bytes32 indexed receiptHash, uint256 amount);

    /**
     * @notice Satu periode ditutup. Semua angka distribusinya final.
     * @param period Periode YYYYMM.
     * @param grossRent Total sewa dalam Rupiah.
     * @param totalExpenses Total biaya dalam Rupiah.
     * @param platformFee Fee platform dalam Rupiah.
     * @param tax Pajak dalam Rupiah.
     * @param netRent Sewa bersih dalam Rupiah.
     * @param totalSupply Total suplai token di blok snapshot.
     * @param valuePerTokenSen Sewa bersih per token dalam sen.
     * @param snapshotBlock Blok acuan saldo pemegang.
     */
    event PeriodClosed(
        uint32 indexed period,
        uint256 grossRent,
        uint256 totalExpenses,
        uint256 platformFee,
        uint256 tax,
        uint256 netRent,
        uint256 totalSupply,
        uint256 valuePerTokenSen,
        uint256 snapshotBlock
    );

    // ---------------------------------------------------------------------
    // Custom error
    // ---------------------------------------------------------------------

    /// @notice Alamat admin atau operator bernilai nol.
    error ZeroAddress();

    /**
     * @notice Alamat token bukan kontrak.
     * @param tokenAddress Alamat yang ditolak.
     */
    error InvalidToken(address tokenAddress);

    /**
     * @notice Parameter basis poin melebihi 10.000 (100%).
     * @param bps Nilai yang ditolak.
     */
    error InvalidBps(uint256 bps);

    /// @notice Nomor kamar bernilai nol.
    error InvalidRoom();

    /**
     * @notice Periode tidak berformat YYYYMM (bulan 01 sampai 12, tahun 2000 sampai 9999).
     * @param period Nilai yang ditolak.
     */
    error InvalidPeriod(uint32 period);

    /// @notice Nominal bernilai nol.
    error ZeroAmount();

    /// @notice Referensi pembayaran bernilai nol.
    error EmptyPaymentRef();

    /// @notice Hash nota bernilai nol.
    error EmptyReceiptHash();

    /**
     * @notice Referensi pembayaran sudah tercatat. Bagi worker, artinya job sudah selesai.
     * @param paymentRef Referensi yang ditolak.
     */
    error PaymentRefAlreadyRecorded(bytes32 paymentRef);

    /**
     * @notice Kamar ini sudah tercatat membayar sewa di periode ini lewat referensi lain.
     * @param room Nomor kamar.
     * @param period Periode YYYYMM.
     */
    error RentAlreadyRecorded(uint16 room, uint32 period);

    /**
     * @notice Hash nota sudah tercatat. Bagi worker, artinya job sudah selesai.
     * @param receiptHash Hash yang ditolak.
     */
    error ReceiptAlreadyRecorded(bytes32 receiptHash);

    /**
     * @notice Periode sudah ditutup, tidak bisa menerima catatan baru atau ditutup lagi.
     * @param period Periode YYYYMM.
     */
    error PeriodAlreadyClosed(uint32 period);

    /**
     * @notice Periode belum ditutup, jadi belum punya angka distribusi.
     * @param period Periode YYYYMM.
     */
    error PeriodNotClosed(uint32 period);

    /**
     * @notice Periode tanpa sewa dan tanpa biaya tidak bisa ditutup.
     * @param period Periode YYYYMM.
     */
    error EmptyPeriod(uint32 period);

    /**
     * @notice Total suplai token bernilai nol di blok snapshot.
     * @param snapshotBlock Blok snapshot.
     */
    error NoSupplyAtSnapshot(uint256 snapshotBlock);

    // ---------------------------------------------------------------------
    // Konstruktor
    // ---------------------------------------------------------------------

    /**
     * @notice Membuat buku besar untuk satu token properti.
     * @dev Pembagian peran sama dengan KosToken. Tarif fee dan pajak immutable, jadi
     * tidak ada pihak yang bisa mengubah aturan perhitungan setelah deploy.
     * @param admin Pemegang DEFAULT_ADMIN_ROLE (pengatur peran) dan PAUSER_ROLE (jeda darurat).
     * @param operator Dompet operator backend: mendapat OPERATOR_ROLE dan PAUSER_ROLE.
     * @param token_ Alamat KosToken properti ini.
     * @param platformFeeBps_ Fee platform dalam basis poin (500).
     * @param taxBps_ Tarif pajak dalam basis poin (2.200).
     */
    constructor(address admin, address operator, IVotes token_, uint256 platformFeeBps_, uint256 taxBps_) {
        if (admin == address(0) || operator == address(0)) revert ZeroAddress();
        if (address(token_).code.length == 0) revert InvalidToken(address(token_));
        if (platformFeeBps_ > BPS_DENOMINATOR) revert InvalidBps(platformFeeBps_);
        if (taxBps_ > BPS_DENOMINATOR) revert InvalidBps(taxBps_);

        token = token_;
        platformFeeBps = platformFeeBps_;
        taxBps = taxBps_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
        _grantRole(PAUSER_ROLE, operator);
    }

    // ---------------------------------------------------------------------
    // Fungsi tulis (hanya pemegang peran)
    // ---------------------------------------------------------------------

    /**
     * @notice Mencatat satu pembayaran sewa yang sudah lunas di Midtrans.
     * @dev Referensi ganda dicek sebelum status periode dan kamar. Bila job diulang
     * setelah transaksinya ternyata berhasil, worker selalu menerima
     * {PaymentRefAlreadyRecorded} dan bisa menganggap job selesai, termasuk bila
     * periodenya sudah ditutup. {RentAlreadyRecorded} berarti kamar sudah lunas
     * lewat `order_id` lain, yaitu kasus DUPLICATE_BILL_PAYMENT.
     * @param room Nomor kamar, 3 untuk K03.
     * @param period Periode YYYYMM, mis. 202611.
     * @param amount Nominal sewa dalam Rupiah.
     * @param paymentRef keccak256 dari order_id, mis. keccak256("RENT-SMR01-K03-2026-11").
     */
    function recordRent(
        uint16 room,
        uint32 period,
        uint256 amount,
        bytes32 paymentRef
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        if (room == 0) revert InvalidRoom();
        _requireValidPeriod(period);
        if (amount == 0) revert ZeroAmount();
        if (paymentRef == bytes32(0)) revert EmptyPaymentRef();
        if (_recordedPaymentRefs[paymentRef]) revert PaymentRefAlreadyRecorded(paymentRef);

        PeriodRecord storage record = periods[period];
        if (record.closed) revert PeriodAlreadyClosed(period);
        if (_rentRecorded[period][room]) revert RentAlreadyRecorded(room, period);

        _recordedPaymentRefs[paymentRef] = true;
        _rentRecorded[period][room] = true;
        record.grossRent += amount;

        emit RentRecorded(period, room, paymentRef, amount);
    }

    /**
     * @notice Mencatat satu biaya operasional beserta hash notanya.
     * @dev Setiap nota hanya bisa dicatat sekali, supaya job yang diulang tidak
     * menggandakan biaya dan mengurangi bagi hasil investor. Seperti di
     * {recordRent}, hash ganda dicek sebelum status periode.
     * @param period Periode YYYYMM.
     * @param category Kode kategori biaya. Daftar kodenya dipegang backend.
     * @param amount Nominal biaya dalam Rupiah.
     * @param receiptHash Hash file nota.
     */
    function recordExpense(
        uint32 period,
        uint8 category,
        uint256 amount,
        bytes32 receiptHash
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        _requireValidPeriod(period);
        if (amount == 0) revert ZeroAmount();
        if (receiptHash == bytes32(0)) revert EmptyReceiptHash();
        if (_recordedReceipts[receiptHash]) revert ReceiptAlreadyRecorded(receiptHash);

        PeriodRecord storage record = periods[period];
        if (record.closed) revert PeriodAlreadyClosed(period);

        _recordedReceipts[receiptHash] = true;
        record.totalExpenses += amount;

        emit ExpenseRecorded(period, category, receiptHash, amount);
    }

    /**
     * @notice Menutup periode dan menyimpan angka distribusinya. Tidak bisa dibatalkan.
     * @dev Blok snapshot adalah `block.number - 1`, blok terakhir yang sudah selesai.
     * getPastVotes menolak blok saat ini (ERC5805FutureLookup), dan saldo di blok saat
     * ini belum final karena transaksi lain di blok yang sama masih bisa mengubahnya.
     * Saldo di akhir blok sebelumnya sudah final dan langsung bisa dibaca, jadi
     * transfer di blok penutupan, baik sebelum maupun sesudah transaksi ini, tidak
     * ikut dihitung. Bila biaya melebihi sewa setelah fee, laba kena pajak, pajak,
     * dan sewa bersih bernilai 0. Defisitnya tidak dibawa ke periode berikutnya.
     * @param period Periode YYYYMM.
     */
    function closePeriod(uint32 period) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        _requireValidPeriod(period);

        PeriodRecord storage record = periods[period];
        if (record.closed) revert PeriodAlreadyClosed(period);
        if (record.grossRent == 0 && record.totalExpenses == 0) revert EmptyPeriod(period);

        uint256 snapshotBlock = block.number - 1;
        uint256 supply = token.getPastTotalSupply(snapshotBlock);
        if (supply == 0) revert NoSupplyAtSnapshot(snapshotBlock);

        // mulDiv menahan hasil antara 512 bit, jadi nominal berapa pun tidak membuat
        // periode gagal ditutup karena overflow. Pembulatannya ke bawah.
        record.platformFee = Math.mulDiv(record.grossRent, platformFeeBps, BPS_DENOMINATOR);
        uint256 taxableProfit = Math.saturatingSub(record.grossRent - record.platformFee, record.totalExpenses);
        record.tax = Math.mulDiv(taxableProfit, taxBps, BPS_DENOMINATOR);
        record.netRent = taxableProfit - record.tax;
        record.totalSupply = supply;
        record.valuePerTokenSen = Math.mulDiv(record.netRent, SEN_PER_RUPIAH, supply);
        record.snapshotBlock = snapshotBlock;
        record.closed = true;

        emit PeriodClosed(
            period,
            record.grossRent,
            record.totalExpenses,
            record.platformFee,
            record.tax,
            record.netRent,
            supply,
            record.valuePerTokenSen,
            snapshotBlock
        );
    }

    /// @notice Menjeda semua pencatatan (jeda darurat).
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Mengakhiri jeda darurat.
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Fungsi baca
    // ---------------------------------------------------------------------

    /**
     * @notice Bagian satu pemegang dari sewa bersih periode yang sudah ditutup.
     * @dev floor(sewaBersih * balance / totalSuplai). Saldo pemegang dibaca dari
     * token.getPastVotes(alamat, snapshotBlock). Jumlah bagian semua pemegang bisa
     * lebih kecil dari sewa bersih; selisihnya adalah sisa pembulatan yang masuk
     * cadangan. Kontrak tidak bisa menghitung sisa itu karena tidak bisa membaca
     * daftar pemegang, jadi backend menghitungnya saat distribusi.
     * @param period Periode YYYYMM.
     * @param balance Saldo token pemegang di blok snapshot.
     * @return Bagian pemegang dalam Rupiah.
     */
    function shareOf(uint32 period, uint256 balance) external view returns (uint256) {
        PeriodRecord storage record = periods[period];
        if (!record.closed) revert PeriodNotClosed(period);
        return Math.mulDiv(record.netRent, balance, record.totalSupply);
    }

    /**
     * @notice Mengecek apakah referensi pembayaran sudah tercatat.
     * @dev Dipakai worker untuk idempotensi sebelum memanggil {recordRent}.
     * @param paymentRef keccak256 dari order_id.
     * @return true bila referensi sudah tercatat.
     */
    function isPaymentRefRecorded(bytes32 paymentRef) external view returns (bool) {
        return _recordedPaymentRefs[paymentRef];
    }

    /**
     * @notice Mengecek apakah hash nota sudah tercatat.
     * @dev Dipakai worker untuk idempotensi sebelum memanggil {recordExpense}.
     * @param receiptHash Hash file nota.
     * @return true bila nota sudah tercatat.
     */
    function isReceiptRecorded(bytes32 receiptHash) external view returns (bool) {
        return _recordedReceipts[receiptHash];
    }

    /**
     * @notice Mengecek apakah sewa satu kamar di satu periode sudah tercatat.
     * @param room Nomor kamar.
     * @param period Periode YYYYMM.
     * @return true bila sudah tercatat.
     */
    function isRentRecorded(uint16 room, uint32 period) external view returns (bool) {
        return _rentRecorded[period][room];
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    /// @dev Menolak periode yang bukan YYYYMM, mis. bulan 00 atau 13, atau urutan MMYYYY.
    function _requireValidPeriod(uint32 period) private pure {
        uint32 month = period % 100;
        if (period < MIN_PERIOD || period > MAX_PERIOD || month == 0 || month > 12) {
            revert InvalidPeriod(period);
        }
    }
}
