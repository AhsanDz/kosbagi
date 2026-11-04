// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title KosToken
 * @author Kelompok 9 KosBagi
 * @notice Token hak manfaat ekonomi satu properti kos (satu kontrak per properti,
 * mis. KB-SMR01 untuk Kos Sumbersari 01). Satu token mewakili Rp100.000 nilai
 * properti dan tidak bisa dipecah (decimals = 0). Seluruh suplai dicetak sekali
 * saat deploy: jatah pemilik lama ke dompet pemilik lama, sisanya ke dompet
 * perbendaharaan properti untuk dijual ke investor. Tidak ada fungsi mint
 * lanjutan, jadi suplai tetap.
 * @dev Aturan tambahan di atas ERC-20 ditegakkan di {_update}, satu-satunya
 * jalur perpindahan saldo (transfer, transferFrom, transferFromTreasury, mint):
 * 1. penerima wajib berstatus lolos KYC;
 * 2. saldo penerima maksimal 10% suplai, kecuali dompet pemilik lama dan perbendaharaan;
 * 3. penerima yang belum punya delegasi otomatis didelegasikan ke dirinya sendiri,
 *    sehingga getVotes/getPastVotes selalu sama dengan saldo;
 * 4. semua perpindahan berhenti saat kontrak dijeda (ERC20Pausable).
 * Kontrak juga menyimpan registri dokumen properti: hash setiap jenis dokumen
 * (sertifikat, laporan penilaian, perjanjian pengelolaan, dan jenis lain yang
 * disepakati) beserta seluruh versi sebelumnya.
 * Data on-chain hanya kode properti, alamat dompet, nominal, dan hash. Tidak ada
 * nama atau data pribadi.
 */
contract KosToken is ERC20, ERC20Pausable, AccessControl, ERC20Permit, ERC20Votes {
    // ---------------------------------------------------------------------
    // Peran (AccessControl). DEFAULT_ADMIN_ROLE dari OpenZeppelin mengatur
    // pemberian dan pencabutan semua peran di bawah.
    // ---------------------------------------------------------------------

    /// @notice Peran dompet operator: memindahkan token dari perbendaharaan ke dompet kustodian investor.
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// @notice Peran pengelola daftar alamat lolos KYC.
    bytes32 public constant KYC_ROLE = keccak256("KYC_ROLE");

    /// @notice Peran jeda darurat: menghentikan dan melanjutkan semua perpindahan token.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ---------------------------------------------------------------------
    // Jenis dokumen di registri. Jenis baru boleh dipakai tanpa mengubah kontrak
    // dengan pola yang sama: keccak256("DOCUMENT_<NAMA>").
    // ---------------------------------------------------------------------

    /// @notice Jenis dokumen sertifikat properti (dicatat saat deploy).
    bytes32 public constant DOCUMENT_CERTIFICATE = keccak256("DOCUMENT_CERTIFICATE");

    /// @notice Jenis dokumen laporan penilaian (appraisal) properti (dicatat saat deploy, bisa diperbarui tiap tahun).
    bytes32 public constant DOCUMENT_APPRAISAL_REPORT = keccak256("DOCUMENT_APPRAISAL_REPORT");

    /// @notice Jenis dokumen perjanjian pengelolaan antara pemilik lama, kustodian, dan platform.
    bytes32 public constant DOCUMENT_MANAGEMENT_AGREEMENT = keccak256("DOCUMENT_MANAGEMENT_AGREEMENT");

    // ---------------------------------------------------------------------
    // Konstanta dan data penerbitan
    // ---------------------------------------------------------------------

    /// @notice Batas saldo per alamat dalam basis poin dari total suplai (1.000 bp = 10%).
    uint256 public constant MAX_BALANCE_BPS = 1_000;

    /// @notice Penyebut basis poin (10.000 bp = 100%).
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Dompet pemilik lama properti. Dikecualikan dari batas saldo 10%.
    address public immutable originalOwner;

    /// @notice Dompet perbendaharaan properti, sumber token yang dijual ke investor. Dikecualikan dari batas saldo 10%.
    address public immutable treasury;

    /// @notice Saldo maksimal per alamat selain pemilik lama dan perbendaharaan (10% suplai, 1.800 untuk KB-SMR01).
    uint256 public immutable maxBalance;

    /// @notice Kode properti, mis. "SMR01". Nama token "KosBagi <kode>" dan simbol "KB-<kode>" dibentuk dari kode ini.
    string public propertyCode;

    /// @dev Status KYC per alamat. true = boleh menerima token.
    mapping(address account => bool) private _kycApproved;

    /// @dev Referensi pembelian (keccak256 order_id BUY-...) yang sudah dipakai {transferFromTreasury}.
    mapping(bytes32 purchaseRef => bool) private _usedPurchaseRefs;

    /// @dev Riwayat hash per jenis dokumen, urut dari versi pertama. Elemen terakhir = versi berlaku.
    mapping(bytes32 documentType => bytes32[] hashes) private _documentHistory;

    // ---------------------------------------------------------------------
    // Event
    // ---------------------------------------------------------------------

    /**
     * @notice Dipancarkan sekali saat deploy sebagai bukti penerbitan token.
     * @param code Kode properti.
     * @param ownerWallet Dompet pemilik lama.
     * @param treasuryWallet Dompet perbendaharaan properti.
     * @param supply Total suplai yang dicetak.
     */
    event TokenIssued(string code, address indexed ownerWallet, address indexed treasuryWallet, uint256 supply);

    /**
     * @notice Hash sebuah dokumen properti dicatat di registri (versi pertama atau pengganti).
     * @param documentType Jenis dokumen, mis. DOCUMENT_CERTIFICATE.
     * @param documentHash Hash dokumen yang sekarang berlaku.
     * @param previousHash Hash versi sebelumnya (nol bila ini versi pertama).
     * @param version Nomor versi, mulai dari 1.
     */
    event DocumentAnchored(
        bytes32 indexed documentType,
        bytes32 documentHash,
        bytes32 previousHash,
        uint256 version
    );

    /**
     * @notice Status KYC sebuah alamat diubah.
     * @param account Alamat yang diubah statusnya.
     * @param approved true bila lolos KYC, false bila dicabut.
     */
    event KycStatusUpdated(address indexed account, bool approved);

    /**
     * @notice Operator memindahkan token dari perbendaharaan untuk satu pembelian yang sudah lunas.
     * @param purchaseRef Hash referensi pembelian, keccak256(order_id).
     * @param to Dompet kustodian penerima.
     * @param amount Jumlah token.
     */
    event TreasuryTransfer(bytes32 indexed purchaseRef, address indexed to, uint256 amount);

    // ---------------------------------------------------------------------
    // Custom error
    // ---------------------------------------------------------------------

    /// @notice Alamat nol diberikan untuk parameter yang wajib diisi.
    error ZeroAddress();

    /// @notice Kode properti kosong saat deploy.
    error EmptyPropertyCode();

    /// @notice Jenis dokumen bernilai nol.
    error EmptyDocumentType();

    /// @notice Hash dokumen bernilai nol.
    error EmptyDocumentHash();

    /**
     * @notice Hash yang sama sudah menjadi versi berlaku untuk jenis dokumen ini.
     * @param documentType Jenis dokumen.
     * @param documentHash Hash yang ditolak.
     */
    error DocumentAlreadyAnchored(bytes32 documentType, bytes32 documentHash);

    /// @notice Dompet pemilik lama dan perbendaharaan tidak boleh sama.
    error SameOwnerAndTreasury();

    /// @notice Total suplai terlalu kecil sehingga batas 10% bernilai nol (minimal 10 token).
    error SupplyTooSmall();

    /**
     * @notice Penerima token belum lolos KYC.
     * @param recipient Alamat penerima.
     */
    error RecipientNotKycApproved(address recipient);

    /**
     * @notice Saldo penerima akan melebihi batas 10% suplai.
     * @param recipient Alamat penerima.
     * @param newBalance Saldo penerima seandainya transfer diteruskan.
     * @param cap Batas saldo per alamat.
     */
    error BalanceCapExceeded(address recipient, uint256 newBalance, uint256 cap);

    /// @notice Jumlah token yang dipindahkan bernilai nol.
    error ZeroAmount();

    /// @notice Referensi pembelian bernilai nol.
    error EmptyPurchaseRef();

    /**
     * @notice Referensi pembelian sudah pernah dipakai (mencegah token terkirim dua kali).
     * @param purchaseRef Referensi yang ditolak.
     */
    error PurchaseRefAlreadyUsed(bytes32 purchaseRef);

    /// @notice Delegasi manual dimatikan; setiap pemegang selalu terdelegasi ke dirinya sendiri.
    error DelegationDisabled();

    // ---------------------------------------------------------------------
    // Konstruktor
    // ---------------------------------------------------------------------

    /**
     * @notice Menerbitkan token satu properti dan membagi suplai ke pemilik lama dan perbendaharaan.
     * @dev Pemilik lama dan perbendaharaan langsung berstatus lolos KYC (verifikasi
     * keduanya dilakukan off-chain saat onboarding properti) supaya bisa menerima
     * hasil mint. Peran operator, KYC, dan jeda diberikan ke `operator`. Admin juga
     * mendapat PAUSER_ROLE supaya bisa menjeda sendiri saat darurat (mis. kunci
     * operator bocor), lalu mencabut peran operator sebelum operator sempat
     * melanjutkan. Hash sertifikat dan laporan penilaian wajib ada dan dicatat
     * sebagai versi 1 di registri dokumen lewat mekanisme yang sama dengan
     * {anchorDocument}. Dokumen lain (mis. perjanjian pengelolaan) dicatat admin
     * setelah deploy.
     * @param propertyCode_ Kode properti, mis. "SMR01".
     * @param certificateHash Hash dokumen sertifikat (disarankan SHA-256 isi file PDF).
     * @param appraisalReportHash Hash dokumen laporan penilaian (disarankan SHA-256 isi file PDF).
     * @param admin Pemegang DEFAULT_ADMIN_ROLE (pengatur peran dan registri dokumen) dan PAUSER_ROLE (jeda darurat).
     * @param operator Dompet operator backend: mendapat OPERATOR_ROLE, KYC_ROLE, dan PAUSER_ROLE.
     * @param originalOwner_ Dompet pemilik lama.
     * @param treasury_ Dompet perbendaharaan properti.
     * @param originalOwnerAllocation Jatah token pemilik lama (5.400 untuk KB-SMR01).
     * @param treasuryAllocation Token yang ditawarkan ke investor (12.600 untuk KB-SMR01).
     */
    constructor(
        string memory propertyCode_,
        bytes32 certificateHash,
        bytes32 appraisalReportHash,
        address admin,
        address operator,
        address originalOwner_,
        address treasury_,
        uint256 originalOwnerAllocation,
        uint256 treasuryAllocation
    )
        ERC20(string.concat("KosBagi ", propertyCode_), string.concat("KB-", propertyCode_))
        ERC20Permit(string.concat("KosBagi ", propertyCode_))
    {
        if (bytes(propertyCode_).length == 0) revert EmptyPropertyCode();
        if (
            admin == address(0) || operator == address(0) || originalOwner_ == address(0) || treasury_ == address(0)
        ) {
            revert ZeroAddress();
        }
        if (originalOwner_ == treasury_) revert SameOwnerAndTreasury();

        uint256 supply = originalOwnerAllocation + treasuryAllocation;
        uint256 cap = (supply * MAX_BALANCE_BPS) / BPS_DENOMINATOR;
        if (cap == 0) revert SupplyTooSmall();

        propertyCode = propertyCode_;
        originalOwner = originalOwner_;
        treasury = treasury_;
        maxBalance = cap;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
        _grantRole(KYC_ROLE, operator);
        _grantRole(PAUSER_ROLE, operator);

        _anchorDocument(DOCUMENT_CERTIFICATE, certificateHash);
        _anchorDocument(DOCUMENT_APPRAISAL_REPORT, appraisalReportHash);

        _setKycStatus(originalOwner_, true);
        _setKycStatus(treasury_, true);

        _mint(originalOwner_, originalOwnerAllocation);
        _mint(treasury_, treasuryAllocation);

        emit TokenIssued(propertyCode_, originalOwner_, treasury_, supply);
    }

    // ---------------------------------------------------------------------
    // Fungsi tulis (hanya pemegang peran)
    // ---------------------------------------------------------------------

    /**
     * @notice Menandai sebuah alamat lolos KYC (approved = true) atau mencabutnya (false).
     * @dev Dipanggil worker backend setelah admin menyetujui KYC dummy investor.
     * Pencabutan hanya menghalangi alamat menerima token; token yang sudah dimiliki
     * tetap bisa dikirim keluar, mis. dikembalikan ke perbendaharaan. Memanggil
     * ulang dengan status yang sama tidak gagal, jadi aman untuk retry job.
     * @param account Alamat dompet (kustodian) yang diubah statusnya.
     * @param approved Status KYC baru.
     */
    function setKycStatus(address account, bool approved) external onlyRole(KYC_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _setKycStatus(account, approved);
    }

    /**
     * @notice Memindahkan token dari perbendaharaan ke dompet kustodian investor setelah pembelian lunas.
     * @dev Dompet perbendaharaan tidak perlu menandatangani apa pun: kontrak sendiri
     * yang mengizinkan OPERATOR_ROLE memindahkan saldo khusus dari alamat
     * perbendaharaan, tidak dari alamat lain. Aturan KYC, batas 10%, dan jeda tetap
     * berlaku karena perpindahan lewat {_update}. Setiap `purchaseRef` hanya bisa
     * dipakai sekali; bila transaksi gagal (revert), referensi tidak ikut tercatat
     * sehingga job bisa diulang.
     * @param to Dompet kustodian investor (harus lolos KYC).
     * @param amount Jumlah token (bilangan bulat, decimals = 0).
     * @param purchaseRef keccak256 dari order_id pembelian, mis. keccak256("BUY-SMR01-...").
     */
    function transferFromTreasury(address to, uint256 amount, bytes32 purchaseRef) external onlyRole(OPERATOR_ROLE) {
        if (amount == 0) revert ZeroAmount();
        if (purchaseRef == bytes32(0)) revert EmptyPurchaseRef();
        if (_usedPurchaseRefs[purchaseRef]) revert PurchaseRefAlreadyUsed(purchaseRef);

        _usedPurchaseRefs[purchaseRef] = true;
        _transfer(treasury, to, amount);
        emit TreasuryTransfer(purchaseRef, to, amount);
    }

    /**
     * @notice Mencatat hash dokumen properti di registri, sebagai versi pertama atau pengganti versi lama.
     * @dev Hanya admin (DEFAULT_ADMIN_ROLE), karena pergantian dokumen adalah
     * keputusan tata kelola yang jarang, bukan operasi harian. Hash lama tidak
     * pernah dihapus: semua versi tetap tersimpan di {documentHistory} dan setiap
     * pencatatan memancarkan {DocumentAnchored} berisi hash sebelumnya, sehingga
     * riwayat bisa diaudit dari state kontrak maupun dari log. Hash yang sama dengan
     * versi berlaku ditolak supaya tidak ada versi ganda. Tetap bisa dipakai saat jeda.
     * @param documentType Jenis dokumen, mis. DOCUMENT_MANAGEMENT_AGREEMENT atau keccak256("DOCUMENT_<NAMA>").
     * @param documentHash Hash dokumen (disarankan SHA-256 isi file PDF).
     */
    function anchorDocument(bytes32 documentType, bytes32 documentHash) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _anchorDocument(documentType, documentHash);
    }

    /// @notice Menjeda semua perpindahan token (jeda darurat).
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
     * @notice Mengecek apakah sebuah alamat lolos KYC.
     * @param account Alamat yang dicek.
     * @return true bila alamat boleh menerima token.
     */
    function isKycApproved(address account) external view returns (bool) {
        return _kycApproved[account];
    }

    /**
     * @notice Mengecek apakah referensi pembelian sudah dipakai.
     * @dev Dipakai worker untuk idempotensi sebelum memanggil {transferFromTreasury}.
     * @param purchaseRef keccak256 dari order_id pembelian.
     * @return true bila referensi sudah dipakai.
     */
    function isPurchaseRefUsed(bytes32 purchaseRef) external view returns (bool) {
        return _usedPurchaseRefs[purchaseRef];
    }

    /**
     * @notice Hash versi berlaku sebuah jenis dokumen.
     * @param documentType Jenis dokumen.
     * @return Hash versi terakhir, atau nol bila jenis dokumen ini belum pernah dicatat.
     */
    function currentDocumentHash(bytes32 documentType) external view returns (bytes32) {
        bytes32[] storage history = _documentHistory[documentType];
        return history.length == 0 ? bytes32(0) : history[history.length - 1];
    }

    /**
     * @notice Seluruh versi hash sebuah jenis dokumen, dari versi 1 sampai versi berlaku.
     * @param documentType Jenis dokumen.
     * @return Daftar hash; indeks 0 = versi 1. Kosong bila belum pernah dicatat.
     */
    function documentHistory(bytes32 documentType) external view returns (bytes32[] memory) {
        return _documentHistory[documentType];
    }

    /**
     * @notice Token tidak bisa dipecah: 1 token = 1 unit = Rp100.000.
     * @return Selalu 0.
     */
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    // ---------------------------------------------------------------------
    // Delegasi manual dimatikan
    // ---------------------------------------------------------------------

    /**
     * @notice Delegasi manual tidak tersedia.
     * @dev Semua pemegang otomatis terdelegasi ke diri sendiri saat pertama menerima
     * token, sehingga getPastVotes bisa dipakai sebagai snapshot saldo untuk bagi
     * hasil dan bobot voting. Delegasi ke pihak lain akan merusak kesetaraan itu.
     */
    function delegate(address) public pure override {
        revert DelegationDisabled();
    }

    /// @notice Delegasi lewat tanda tangan juga tidak tersedia (lihat {delegate}).
    function delegateBySig(address, uint256, uint256, uint8, bytes32, bytes32) public pure override {
        revert DelegationDisabled();
    }

    // ---------------------------------------------------------------------
    // Override yang diwajibkan Solidity untuk pewarisan ganda
    // ---------------------------------------------------------------------

    /// @inheritdoc ERC20Permit
    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }

    /**
     * @dev Satu-satunya jalur perubahan saldo. Urutan: cek KYC penerima, delegasi
     * otomatis (saldo penerima masih lama), perpindahan saldo + cek jeda + checkpoint
     * suara (super._update), lalu cek batas 10% memakai saldo baru. Cek batas
     * memakai saldo setelah perpindahan sehingga transfer ke diri sendiri tidak
     * terhitung ganda. Bila satu cek gagal, seluruh transaksi dibatalkan.
     */
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable, ERC20Votes) {
        if (to != address(0)) {
            if (!_kycApproved[to]) revert RecipientNotKycApproved(to);
            if (delegates(to) == address(0)) _delegate(to, to);
        }

        super._update(from, to, value);

        if (to != address(0) && to != originalOwner && to != treasury) {
            uint256 newBalance = balanceOf(to);
            if (newBalance > maxBalance) revert BalanceCapExceeded(to, newBalance, maxBalance);
        }
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    /// @dev Menyimpan status KYC dan memancarkan {KycStatusUpdated}.
    function _setKycStatus(address account, bool approved) private {
        _kycApproved[account] = approved;
        emit KycStatusUpdated(account, approved);
    }

    /// @dev Menambah versi baru ke riwayat dokumen dan memancarkan {DocumentAnchored}.
    function _anchorDocument(bytes32 documentType, bytes32 documentHash) private {
        if (documentType == bytes32(0)) revert EmptyDocumentType();
        if (documentHash == bytes32(0)) revert EmptyDocumentHash();

        bytes32[] storage history = _documentHistory[documentType];
        bytes32 previousHash = history.length == 0 ? bytes32(0) : history[history.length - 1];
        if (documentHash == previousHash) revert DocumentAlreadyAnchored(documentType, documentHash);

        history.push(documentHash);
        emit DocumentAnchored(documentType, documentHash, previousHash, history.length);
    }
}
