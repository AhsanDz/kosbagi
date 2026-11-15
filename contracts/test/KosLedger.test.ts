import { expect } from "chai";
import type { ContractTransactionResponse } from "ethers";
import { network } from "hardhat";

// Satu koneksi jaringan Hardhat lokal (in-process) untuk seluruh file ini.
// loadFixture memulihkan snapshot hasil deploy sebelum setiap test.
const { ethers, networkHelpers } = await network.create();

// Parameter KB-SMR01.
const PROPERTY_CODE = "SMR01";
const OWNER_ALLOCATION = 5_400n;
const TREASURY_ALLOCATION = 12_600n;
const TOTAL_SUPPLY = 18_000n;
const PLATFORM_FEE_BPS = 500n; // 5% dari sewa kotor
const TAX_BPS = 2_200n; // PPh badan 22% atas laba

const PERIOD = 202611; // November 2026
const NEXT_PERIOD = 202612;
const MONTHLY_RENT = 1_500_000n;
const OCCUPIED_ROOMS = [1, 2, 3, 4, 5, 7, 8, 9, 10]; // K06 kosong
const CATEGORY_OPERATIONS = 1;

// Angka satu bulan Kos Sumbersari 01, dihitung manual (kontrak P2 bagian 6):
//   sewa kotor   9 x 1.500.000                 = 13.500.000
//   biaya        20% sewa kotor                =  2.700.000
//   fee          5% x 13.500.000               =    675.000
//   laba kena    13.500.000 - 2.700.000 - 675.000 = 10.125.000
//   pajak        22% x 10.125.000              =  2.227.500
//   sewa bersih  10.125.000 - 2.227.500        =  7.897.500
//   per token    7.897.500 / 18.000            =     438,75 -> 43875 sen
//   100 token    7.897.500 x 100 / 18.000      =     43.875
//   5.400 token  7.897.500 x 5.400 / 18.000    =  2.369.250
const MANUAL = {
  grossRent: 13_500_000n,
  totalExpenses: 2_700_000n,
  platformFee: 675_000n,
  tax: 2_227_500n,
  netRent: 7_897_500n,
  valuePerTokenSen: 43_875n,
  shareOf100Tokens: 43_875n,
  shareOfOwner: 2_369_250n,
};

/** Referensi on-chain = keccak256(order_id), sama seperti di backend. */
function ref(orderId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(orderId));
}

/** order_id percobaan pertama sebuah kamar di sebuah periode. */
function rentOrderId(room: number, period = PERIOD): string {
  const code = String(room).padStart(2, "0");
  const text = String(period);
  return `RENT-SMR01-K${code}-${text.slice(0, 4)}-${text.slice(4)}`;
}

/** Hash nota dummy. Di aplikasi: hash dari isi file nota. */
function receipt(name: string): string {
  return ethers.sha256(ethers.toUtf8Bytes(`dummy: nota ${name}`));
}

/** Nomor blok tempat sebuah transaksi ditambang. */
async function blockOf(txPromise: Promise<ContractTransactionResponse>): Promise<number> {
  const mined = await (await txPromise).wait();
  if (mined === null) throw new Error("Receipt transaksi kosong");
  return mined.blockNumber;
}

/** Menjalankan `work` dengan auto-mine mati, jadi semua transaksinya masuk satu blok saat ditambang. */
async function withoutAutomine<T>(work: () => Promise<T>): Promise<T> {
  await ethers.provider.send("evm_setAutomine", [false]);
  try {
    return await work();
  } finally {
    await ethers.provider.send("evm_setAutomine", [true]);
  }
}

async function deployKosLedgerFixture() {
  const [admin, operator, originalOwner, treasury, investorA, investorB, outsider] = await ethers.getSigners();

  const tokenFactory = await ethers.getContractFactory("KosToken");
  const token = await tokenFactory.deploy(
    PROPERTY_CODE,
    ethers.sha256(ethers.toUtf8Bytes("dummy: sertifikat")),
    ethers.sha256(ethers.toUtf8Bytes("dummy: laporan penilaian")),
    admin,
    operator,
    originalOwner,
    treasury,
    OWNER_ALLOCATION,
    TREASURY_ALLOCATION,
  );
  await token.waitForDeployment();

  const ledgerFactory = await ethers.getContractFactory("KosLedger");
  const ledger = await ledgerFactory.deploy(admin, operator, token, PLATFORM_FEE_BPS, TAX_BPS);
  await ledger.waitForDeployment();

  const roles = {
    admin: await ledger.DEFAULT_ADMIN_ROLE(),
    operator: await ledger.OPERATOR_ROLE(),
    pauser: await ledger.PAUSER_ROLE(),
  };
  const asOperator = ledger.connect(operator);
  const asTokenOperator = token.connect(operator);

  return {
    token,
    ledger,
    tokenFactory,
    ledgerFactory,
    roles,
    asOperator,
    asTokenOperator,
    admin,
    operator,
    originalOwner,
    treasury,
    investorA,
    investorB,
    outsider,
  };
}

type Fixture = Awaited<ReturnType<typeof deployKosLedgerFixture>>;

/** Mencatat sewa 9 kamar terisi dan satu biaya 2.700.000 untuk `period`. */
async function recordCaseStudy({ asOperator }: Fixture, period = PERIOD) {
  for (const room of OCCUPIED_ROOMS) {
    await asOperator.recordRent(room, period, MONTHLY_RENT, ref(rentOrderId(room, period)));
  }
  await asOperator.recordExpense(period, CATEGORY_OPERATIONS, MANUAL.totalExpenses, receipt(`biaya ${period}`));
}

describe("KosLedger", function () {
  describe("Deploy", function () {
    it("menyimpan alamat token dan tarif, lalu membagi peran seperti KosToken", async function () {
      const { token, ledger, roles, admin, operator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      expect(await ledger.token()).to.equal(await token.getAddress());
      expect(await ledger.platformFeeBps()).to.equal(PLATFORM_FEE_BPS);
      expect(await ledger.taxBps()).to.equal(TAX_BPS);
      expect(await ledger.BPS_DENOMINATOR()).to.equal(10_000n);
      expect(await ledger.SEN_PER_RUPIAH()).to.equal(100n);

      expect(await ledger.hasRole(roles.admin, admin)).to.equal(true);
      expect(await ledger.hasRole(roles.pauser, admin)).to.equal(true);
      expect(await ledger.hasRole(roles.operator, admin)).to.equal(false);

      expect(await ledger.hasRole(roles.operator, operator)).to.equal(true);
      expect(await ledger.hasRole(roles.pauser, operator)).to.equal(true);
      expect(await ledger.hasRole(roles.admin, operator)).to.equal(false);
    });

    it("menolak alamat admin atau operator nol", async function () {
      const { ledgerFactory, token, admin, operator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await expect(
        ledgerFactory.deploy(ethers.ZeroAddress, operator, token, PLATFORM_FEE_BPS, TAX_BPS),
      ).to.be.revertedWithCustomError(ledgerFactory, "ZeroAddress");
      await expect(
        ledgerFactory.deploy(admin, ethers.ZeroAddress, token, PLATFORM_FEE_BPS, TAX_BPS),
      ).to.be.revertedWithCustomError(ledgerFactory, "ZeroAddress");
    });

    it("menolak alamat token yang bukan kontrak", async function () {
      const { ledgerFactory, admin, operator, outsider } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await expect(ledgerFactory.deploy(admin, operator, outsider, PLATFORM_FEE_BPS, TAX_BPS))
        .to.be.revertedWithCustomError(ledgerFactory, "InvalidToken")
        .withArgs(outsider.address);
      await expect(ledgerFactory.deploy(admin, operator, ethers.ZeroAddress, PLATFORM_FEE_BPS, TAX_BPS))
        .to.be.revertedWithCustomError(ledgerFactory, "InvalidToken")
        .withArgs(ethers.ZeroAddress);
    });

    it("menolak tarif di atas 10.000 bp dan menerima tepat 10.000 bp", async function () {
      const { ledgerFactory, token, admin, operator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await expect(ledgerFactory.deploy(admin, operator, token, 10_001n, TAX_BPS))
        .to.be.revertedWithCustomError(ledgerFactory, "InvalidBps")
        .withArgs(10_001n);
      await expect(ledgerFactory.deploy(admin, operator, token, PLATFORM_FEE_BPS, 10_001n))
        .to.be.revertedWithCustomError(ledgerFactory, "InvalidBps")
        .withArgs(10_001n);

      const edge = await ledgerFactory.deploy(admin, operator, token, 10_000n, 10_000n);
      expect(await edge.platformFeeBps()).to.equal(10_000n);
      expect(await edge.taxBps()).to.equal(10_000n);
    });
  });

  describe("recordRent", function () {
    it("mencatat sewa, memancarkan event, dan menambah sewa kotor periode", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const paymentRef = ref(rentOrderId(3));

      await expect(asOperator.recordRent(3, PERIOD, MONTHLY_RENT, paymentRef))
        .to.emit(ledger, "RentRecorded")
        .withArgs(BigInt(PERIOD), 3n, paymentRef, MONTHLY_RENT);

      expect(await ledger.isPaymentRefRecorded(paymentRef)).to.equal(true);
      expect(await ledger.isRentRecorded(3, PERIOD)).to.equal(true);
      expect((await ledger.periods(PERIOD)).grossRent).to.equal(MONTHLY_RENT);

      await asOperator.recordRent(4, PERIOD, MONTHLY_RENT, ref(rentOrderId(4)));
      expect((await ledger.periods(PERIOD)).grossRent).to.equal(MONTHLY_RENT * 2n);
    });

    it("mengembalikan false untuk referensi dan kamar yang belum tercatat", async function () {
      const { ledger } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      expect(await ledger.isPaymentRefRecorded(ref(rentOrderId(3)))).to.equal(false);
      expect(await ledger.isRentRecorded(3, PERIOD)).to.equal(false);
    });

    it("Skenario 11: pemanggil tidak berwenang ditolak dan tidak ada yang tercatat", async function () {
      const { ledger, roles, outsider } = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const paymentRef = ref(rentOrderId(3));

      await expect(ledger.connect(outsider).recordRent(3, PERIOD, MONTHLY_RENT, paymentRef))
        .to.be.revertedWithCustomError(ledger, "AccessControlUnauthorizedAccount")
        .withArgs(outsider.address, roles.operator);

      expect(await ledger.isPaymentRefRecorded(paymentRef)).to.equal(false);
      expect(await ledger.isRentRecorded(3, PERIOD)).to.equal(false);
      expect((await ledger.periods(PERIOD)).grossRent).to.equal(0n);
    });

    it("Skenario 11: admin yang tidak memegang OPERATOR_ROLE juga ditolak", async function () {
      const { ledger, roles, admin } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await expect(ledger.connect(admin).recordRent(3, PERIOD, MONTHLY_RENT, ref(rentOrderId(3))))
        .to.be.revertedWithCustomError(ledger, "AccessControlUnauthorizedAccount")
        .withArgs(admin.address, roles.operator);
    });

    it("menolak referensi pembayaran yang sudah tercatat, walaupun kamar dan periodenya berbeda", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const paymentRef = ref(rentOrderId(3));

      await asOperator.recordRent(3, PERIOD, MONTHLY_RENT, paymentRef);

      await expect(asOperator.recordRent(3, PERIOD, MONTHLY_RENT, paymentRef))
        .to.be.revertedWithCustomError(ledger, "PaymentRefAlreadyRecorded")
        .withArgs(paymentRef);
      await expect(asOperator.recordRent(4, NEXT_PERIOD, MONTHLY_RENT, paymentRef))
        .to.be.revertedWithCustomError(ledger, "PaymentRefAlreadyRecorded")
        .withArgs(paymentRef);
      expect((await ledger.periods(PERIOD)).grossRent).to.equal(MONTHLY_RENT);
      expect((await ledger.periods(NEXT_PERIOD)).grossRent).to.equal(0n);
    });

    it("menolak sewa kedua untuk kamar dan periode yang sama lewat referensi lain", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const secondAttempt = ref(`${rentOrderId(3)}-2`);

      await asOperator.recordRent(3, PERIOD, MONTHLY_RENT, ref(rentOrderId(3)));

      await expect(asOperator.recordRent(3, PERIOD, MONTHLY_RENT, secondAttempt))
        .to.be.revertedWithCustomError(ledger, "RentAlreadyRecorded")
        .withArgs(3n, BigInt(PERIOD));

      expect(await ledger.isPaymentRefRecorded(secondAttempt)).to.equal(false);
      expect((await ledger.periods(PERIOD)).grossRent).to.equal(MONTHLY_RENT);
    });

    it("menerima kamar sama di periode lain dan kamar lain di periode sama", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await asOperator.recordRent(3, PERIOD, MONTHLY_RENT, ref(rentOrderId(3)));
      await asOperator.recordRent(3, NEXT_PERIOD, MONTHLY_RENT, ref(rentOrderId(3, NEXT_PERIOD)));
      await asOperator.recordRent(4, PERIOD, MONTHLY_RENT, ref(rentOrderId(4)));

      expect((await ledger.periods(PERIOD)).grossRent).to.equal(MONTHLY_RENT * 2n);
      expect((await ledger.periods(NEXT_PERIOD)).grossRent).to.equal(MONTHLY_RENT);
    });

    it("menolak periode yang sudah ditutup", async function () {
      const fixture = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const { ledger, asOperator } = fixture;

      await recordCaseStudy(fixture);
      await asOperator.closePeriod(PERIOD);

      await expect(asOperator.recordRent(6, PERIOD, MONTHLY_RENT, ref(rentOrderId(6))))
        .to.be.revertedWithCustomError(ledger, "PeriodAlreadyClosed")
        .withArgs(BigInt(PERIOD));
      expect((await ledger.periods(PERIOD)).grossRent).to.equal(MANUAL.grossRent);
    });

    it("job yang diulang setelah periode ditutup tetap menerima PaymentRefAlreadyRecorded", async function () {
      const fixture = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const { ledger, asOperator } = fixture;
      const paymentRef = ref(rentOrderId(3));

      await recordCaseStudy(fixture);
      await asOperator.closePeriod(PERIOD);

      await expect(asOperator.recordRent(3, PERIOD, MONTHLY_RENT, paymentRef))
        .to.be.revertedWithCustomError(ledger, "PaymentRefAlreadyRecorded")
        .withArgs(paymentRef);
    });

    it("menolak nomor kamar nol, nominal nol, dan referensi nol", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const paymentRef = ref(rentOrderId(3));

      await expect(asOperator.recordRent(0, PERIOD, MONTHLY_RENT, paymentRef)).to.be.revertedWithCustomError(
        ledger,
        "InvalidRoom",
      );
      await expect(asOperator.recordRent(3, PERIOD, 0n, paymentRef)).to.be.revertedWithCustomError(ledger, "ZeroAmount");
      await expect(asOperator.recordRent(3, PERIOD, MONTHLY_RENT, ethers.ZeroHash)).to.be.revertedWithCustomError(
        ledger,
        "EmptyPaymentRef",
      );
    });

    it("menerima nomor kamar terbesar tipe uint16", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await asOperator.recordRent(65_535, PERIOD, MONTHLY_RENT, ref("RENT-SMR01-MAX"));
      expect(await ledger.isRentRecorded(65_535, PERIOD)).to.equal(true);
    });

    for (const period of [0, 20261, 199_912, 200_000, 202_600, 202_613, 112_026, 999_913, 1_000_001]) {
      it(`menolak periode ${period} yang bukan YYYYMM`, async function () {
        const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

        await expect(asOperator.recordRent(3, period, MONTHLY_RENT, ref(rentOrderId(3))))
          .to.be.revertedWithCustomError(ledger, "InvalidPeriod")
          .withArgs(BigInt(period));
      });
    }

    it("menerima batas bawah dan batas atas periode", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await asOperator.recordRent(3, 200_001, MONTHLY_RENT, ref("RENT-MIN"));
      await asOperator.recordRent(3, 999_912, MONTHLY_RENT, ref("RENT-MAX"));

      expect(await ledger.isRentRecorded(3, 200_001)).to.equal(true);
      expect(await ledger.isRentRecorded(3, 999_912)).to.equal(true);
    });

    it("gagal dengan panic overflow bila total sewa melewati uint256, tanpa mengubah catatan", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const secondRef = ref(rentOrderId(4));

      await asOperator.recordRent(3, PERIOD, ethers.MaxUint256, ref(rentOrderId(3)));

      await expect(asOperator.recordRent(4, PERIOD, 1n, secondRef)).to.be.revertedWithPanic(0x11);
      expect(await ledger.isPaymentRefRecorded(secondRef)).to.equal(false);
    });
  });

  describe("recordExpense", function () {
    it("mencatat biaya, memancarkan event, dan menambah total biaya periode", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const receiptHash = receipt("listrik november");

      await expect(asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 700_000n, receiptHash))
        .to.emit(ledger, "ExpenseRecorded")
        .withArgs(BigInt(PERIOD), BigInt(CATEGORY_OPERATIONS), receiptHash, 700_000n);

      expect(await ledger.isReceiptRecorded(receiptHash)).to.equal(true);
      expect((await ledger.periods(PERIOD)).totalExpenses).to.equal(700_000n);

      await asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 300_000n, receipt("air november"));
      expect((await ledger.periods(PERIOD)).totalExpenses).to.equal(1_000_000n);
    });

    it("menerima kode kategori terkecil dan terbesar", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await asOperator.recordExpense(PERIOD, 0, 1n, receipt("kategori nol"));
      await asOperator.recordExpense(PERIOD, 255, 1n, receipt("kategori 255"));

      expect((await ledger.periods(PERIOD)).totalExpenses).to.equal(2n);
    });

    it("mengembalikan false untuk nota yang belum tercatat", async function () {
      const { ledger } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      expect(await ledger.isReceiptRecorded(receipt("belum ada"))).to.equal(false);
    });

    it("menolak pemanggil tanpa OPERATOR_ROLE, termasuk admin", async function () {
      const { ledger, roles, admin, outsider } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      for (const caller of [outsider, admin]) {
        await expect(
          ledger.connect(caller).recordExpense(PERIOD, CATEGORY_OPERATIONS, 1n, receipt("ilegal")),
        )
          .to.be.revertedWithCustomError(ledger, "AccessControlUnauthorizedAccount")
          .withArgs(caller.address, roles.operator);
      }
      expect((await ledger.periods(PERIOD)).totalExpenses).to.equal(0n);
    });

    it("menolak hash nota yang sudah tercatat supaya job yang diulang tidak menggandakan biaya", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const receiptHash = receipt("listrik november");

      await asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 700_000n, receiptHash);

      await expect(asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 700_000n, receiptHash))
        .to.be.revertedWithCustomError(ledger, "ReceiptAlreadyRecorded")
        .withArgs(receiptHash);
      await expect(asOperator.recordExpense(NEXT_PERIOD, 2, 700_000n, receiptHash))
        .to.be.revertedWithCustomError(ledger, "ReceiptAlreadyRecorded")
        .withArgs(receiptHash);
      expect((await ledger.periods(PERIOD)).totalExpenses).to.equal(700_000n);
    });

    it("menolak periode yang sudah ditutup", async function () {
      const fixture = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const { ledger, asOperator } = fixture;

      await recordCaseStudy(fixture);
      await asOperator.closePeriod(PERIOD);

      await expect(asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 1n, receipt("terlambat")))
        .to.be.revertedWithCustomError(ledger, "PeriodAlreadyClosed")
        .withArgs(BigInt(PERIOD));
    });

    it("job yang diulang setelah periode ditutup tetap menerima ReceiptAlreadyRecorded", async function () {
      const fixture = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const { ledger, asOperator } = fixture;
      const receiptHash = receipt(`biaya ${PERIOD}`);

      await recordCaseStudy(fixture);
      await asOperator.closePeriod(PERIOD);

      await expect(asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, MANUAL.totalExpenses, receiptHash))
        .to.be.revertedWithCustomError(ledger, "ReceiptAlreadyRecorded")
        .withArgs(receiptHash);
    });

    it("menolak periode tidak valid, nominal nol, dan hash nota nol", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const receiptHash = receipt("listrik november");

      await expect(asOperator.recordExpense(202_613, CATEGORY_OPERATIONS, 1n, receiptHash))
        .to.be.revertedWithCustomError(ledger, "InvalidPeriod")
        .withArgs(202_613n);
      await expect(asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 0n, receiptHash)).to.be.revertedWithCustomError(
        ledger,
        "ZeroAmount",
      );
      await expect(
        asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 1n, ethers.ZeroHash),
      ).to.be.revertedWithCustomError(ledger, "EmptyReceiptHash");
    });
  });

  describe("closePeriod", function () {
    it("Skenario 12: nilai per token dan semua angka sama dengan hitungan manual", async function () {
      const fixture = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const { ledger, asOperator } = fixture;

      await recordCaseStudy(fixture);
      const closeTx = await asOperator.closePeriod(PERIOD);
      const closeBlock = await blockOf(Promise.resolve(closeTx));
      const snapshotBlock = BigInt(closeBlock - 1);

      await expect(closeTx)
        .to.emit(ledger, "PeriodClosed")
        .withArgs(
          BigInt(PERIOD),
          MANUAL.grossRent,
          MANUAL.totalExpenses,
          MANUAL.platformFee,
          MANUAL.tax,
          MANUAL.netRent,
          TOTAL_SUPPLY,
          MANUAL.valuePerTokenSen,
          snapshotBlock,
        );

      const record = await ledger.periods(PERIOD);
      expect(record.grossRent).to.equal(MANUAL.grossRent);
      expect(record.totalExpenses).to.equal(MANUAL.totalExpenses);
      expect(record.platformFee).to.equal(MANUAL.platformFee);
      expect(record.tax).to.equal(MANUAL.tax);
      expect(record.netRent).to.equal(MANUAL.netRent);
      expect(record.totalSupply).to.equal(TOTAL_SUPPLY);
      expect(record.valuePerTokenSen).to.equal(MANUAL.valuePerTokenSen);
      expect(record.snapshotBlock).to.equal(snapshotBlock);
      expect(record.closed).to.equal(true);
    });

    it("Skenario 12: shareOf memberi 43.875 untuk 100 token dan 2.369.250 untuk 5.400 token", async function () {
      const fixture = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const { ledger, asOperator } = fixture;

      await recordCaseStudy(fixture);
      await asOperator.closePeriod(PERIOD);

      expect(await ledger.shareOf(PERIOD, 100n)).to.equal(MANUAL.shareOf100Tokens);
      expect(await ledger.shareOf(PERIOD, OWNER_ALLOCATION)).to.equal(MANUAL.shareOfOwner);
    });

    it("biaya melebihi sewa: laba kena pajak, pajak, dan sewa bersih 0, fee tetap 5% sewa kotor", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await asOperator.recordRent(3, PERIOD, MANUAL.grossRent, ref(rentOrderId(3)));
      await asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 15_000_000n, receipt("renovasi"));
      await asOperator.closePeriod(PERIOD);

      const record = await ledger.periods(PERIOD);
      expect(record.platformFee).to.equal(675_000n);
      expect(record.tax).to.equal(0n);
      expect(record.netRent).to.equal(0n);
      expect(record.valuePerTokenSen).to.equal(0n);
      expect(await ledger.shareOf(PERIOD, TOTAL_SUPPLY)).to.equal(0n);
    });

    it("biaya + fee tepat sama dengan sewa: sewa bersih 0", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      // 13.500.000 - 675.000 = 12.825.000
      await asOperator.recordRent(3, PERIOD, MANUAL.grossRent, ref(rentOrderId(3)));
      await asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 12_825_000n, receipt("tepat habis"));
      await asOperator.closePeriod(PERIOD);

      const record = await ledger.periods(PERIOD);
      expect(record.tax).to.equal(0n);
      expect(record.netRent).to.equal(0n);
    });

    it("laba kena pajak Rp1: pajak dibulatkan ke 0 dan sewa bersih Rp1", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await asOperator.recordRent(3, PERIOD, MANUAL.grossRent, ref(rentOrderId(3)));
      await asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 12_824_999n, receipt("sisa satu rupiah"));
      await asOperator.closePeriod(PERIOD);

      const record = await ledger.periods(PERIOD);
      expect(record.tax).to.equal(0n);
      expect(record.netRent).to.equal(1n);
      expect(record.valuePerTokenSen).to.equal(0n);
    });

    it("periode tanpa sewa tetapi ada biaya bisa ditutup dengan semua nilai 0", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, MANUAL.totalExpenses, receipt("kamar kosong"));
      await asOperator.closePeriod(PERIOD);

      const record = await ledger.periods(PERIOD);
      expect(record.grossRent).to.equal(0n);
      expect(record.platformFee).to.equal(0n);
      expect(record.tax).to.equal(0n);
      expect(record.netRent).to.equal(0n);
      expect(record.closed).to.equal(true);
    });

    it("periode tanpa biaya: fee 675.000, pajak 2.821.500, bersih 10.003.500, 55575 sen", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await asOperator.recordRent(3, PERIOD, MANUAL.grossRent, ref(rentOrderId(3)));
      await asOperator.closePeriod(PERIOD);

      const record = await ledger.periods(PERIOD);
      expect(record.platformFee).to.equal(675_000n);
      expect(record.tax).to.equal(2_821_500n);
      expect(record.netRent).to.equal(10_003_500n);
      expect(record.valuePerTokenSen).to.equal(55_575n);
    });

    it("setiap pembagian dibulatkan ke bawah", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      // sewa 1.000.019, biaya 7. Hitungan manual:
      //   fee    1.000.019 x 5%  = 50.000,95   -> 50.000
      //   laba   1.000.019 - 50.000 - 7        =  950.012
      //   pajak  950.012 x 22%   = 209.002,64  -> 209.002
      //   bersih 950.012 - 209.002             =  741.010
      //   sen    741.010 x 100 / 18.000 = 4.116,72 -> 4116
      await asOperator.recordRent(3, PERIOD, 1_000_019n, ref(rentOrderId(3)));
      await asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 7n, receipt("kecil"));
      await asOperator.closePeriod(PERIOD);

      const record = await ledger.periods(PERIOD);
      expect(record.platformFee).to.equal(50_000n);
      expect(record.tax).to.equal(209_002n);
      expect(record.netRent).to.equal(741_010n);
      expect(record.valuePerTokenSen).to.equal(4_116n);
    });

    it("nominal terbesar tidak membuat periode gagal ditutup karena overflow perkalian", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const gross = ethers.MaxUint256;

      await asOperator.recordRent(3, PERIOD, gross, ref(rentOrderId(3)));
      await asOperator.closePeriod(PERIOD);

      const record = await ledger.periods(PERIOD);
      const fee = (gross * PLATFORM_FEE_BPS) / 10_000n;
      const tax = ((gross - fee) * TAX_BPS) / 10_000n;
      expect(record.platformFee).to.equal(fee);
      expect(record.tax).to.equal(tax);
      expect(record.netRent).to.equal(gross - fee - tax);
    });

    it("periode yang sudah ditutup tidak bisa ditutup lagi", async function () {
      const fixture = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const { ledger, asOperator } = fixture;

      await recordCaseStudy(fixture);
      await asOperator.closePeriod(PERIOD);

      await expect(asOperator.closePeriod(PERIOD))
        .to.be.revertedWithCustomError(ledger, "PeriodAlreadyClosed")
        .withArgs(BigInt(PERIOD));
    });

    it("periode lain tetap terbuka setelah satu periode ditutup", async function () {
      const fixture = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const { ledger, asOperator } = fixture;

      await recordCaseStudy(fixture);
      await recordCaseStudy(fixture, NEXT_PERIOD);
      await asOperator.closePeriod(PERIOD);

      expect((await ledger.periods(NEXT_PERIOD)).closed).to.equal(false);
      await asOperator.closePeriod(NEXT_PERIOD);
      expect((await ledger.periods(NEXT_PERIOD)).netRent).to.equal(MANUAL.netRent);
    });

    it("menolak periode kosong tanpa catatan apa pun", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await expect(asOperator.closePeriod(PERIOD))
        .to.be.revertedWithCustomError(ledger, "EmptyPeriod")
        .withArgs(BigInt(PERIOD));
    });

    it("menolak periode yang bukan YYYYMM", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await expect(asOperator.closePeriod(202_613))
        .to.be.revertedWithCustomError(ledger, "InvalidPeriod")
        .withArgs(202_613n);
    });

    it("menolak pemanggil tanpa OPERATOR_ROLE, termasuk admin", async function () {
      const fixture = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const { ledger, roles, admin, outsider } = fixture;

      await recordCaseStudy(fixture);

      for (const caller of [outsider, admin]) {
        await expect(ledger.connect(caller).closePeriod(PERIOD))
          .to.be.revertedWithCustomError(ledger, "AccessControlUnauthorizedAccount")
          .withArgs(caller.address, roles.operator);
      }
      expect((await ledger.periods(PERIOD)).closed).to.equal(false);
    });

    it("menolak penutupan bila suplai token nol di blok snapshot", async function () {
      const { tokenFactory, ledgerFactory, admin, operator, originalOwner, treasury } =
        await networkHelpers.loadFixture(deployKosLedgerFixture);

      // Token, ledger, dan penutupan berada di blok yang sama, jadi blok snapshot
      // jatuh sebelum token ada. Kondisi ini tidak terjadi pada urutan deploy normal.
      await withoutAutomine(async () => {
        const token = await tokenFactory.deploy(
          PROPERTY_CODE,
          ethers.id("dummy: sertifikat"),
          ethers.id("dummy: laporan penilaian"),
          admin,
          operator,
          originalOwner,
          treasury,
          OWNER_ALLOCATION,
          TREASURY_ALLOCATION,
        );
        const ledger = await ledgerFactory.deploy(admin, operator, token, PLATFORM_FEE_BPS, TAX_BPS);
        await ledger.connect(operator).recordRent(3, PERIOD, MONTHLY_RENT, ref(rentOrderId(3)));

        const latest = await ethers.provider.getBlockNumber();
        await expect(ledger.connect(operator).closePeriod.staticCall(PERIOD, { blockTag: "pending" }))
          .to.be.revertedWithCustomError(ledger, "NoSupplyAtSnapshot")
          .withArgs(BigInt(latest));
      });
    });
  });

  describe("Blok snapshot", function () {
    async function fixtureWithHolders() {
      const fixture = await deployKosLedgerFixture();
      const { asTokenOperator, investorA, investorB } = fixture;

      await asTokenOperator.setKycStatus(investorA, true);
      await asTokenOperator.setKycStatus(investorB, true);
      await asTokenOperator.transferFromTreasury(investorA, 100n, ref("BUY-SMR01-0001"));
      await recordCaseStudy(fixture);

      return fixture;
    }

    it("blok snapshot adalah blok sebelum penutupan dan langsung bisa dibaca", async function () {
      const { token, ledger, asOperator, investorA } = await networkHelpers.loadFixture(fixtureWithHolders);

      const closeBlock = await blockOf(asOperator.closePeriod(PERIOD));
      const { snapshotBlock } = await ledger.periods(PERIOD);

      expect(snapshotBlock).to.equal(BigInt(closeBlock - 1));
      expect(await token.getPastVotes(investorA, snapshotBlock)).to.equal(100n);
      expect(await token.getPastTotalSupply(snapshotBlock)).to.equal(TOTAL_SUPPLY);
    });

    it("transfer di blok yang sama dengan penutupan tidak ikut dihitung, sebelum maupun sesudahnya", async function () {
      const { token, ledger, asOperator, investorA, investorB } = await networkHelpers.loadFixture(fixtureWithHolders);
      const asInvestorA = token.connect(investorA);

      const [before, close, after] = await withoutAutomine(async () => {
        const txBefore = await asInvestorA.transfer(investorB, 10n);
        const txClose = await asOperator.closePeriod(PERIOD);
        const txAfter = await asInvestorA.transfer(investorB, 20n);
        await networkHelpers.mine();
        return [await txBefore.wait(), await txClose.wait(), await txAfter.wait()];
      });

      // Ketiganya harus satu blok dengan urutan yang sama, supaya test ini bermakna.
      expect(before?.blockNumber).to.equal(close?.blockNumber);
      expect(after?.blockNumber).to.equal(close?.blockNumber);
      expect(before?.index).to.be.lessThan(close?.index ?? 0);
      expect(after?.index).to.be.greaterThan(close?.index ?? 0);

      const { snapshotBlock } = await ledger.periods(PERIOD);
      expect(snapshotBlock).to.equal(BigInt((close?.blockNumber ?? 0) - 1));
      expect(await token.getPastVotes(investorA, snapshotBlock)).to.equal(100n);
      expect(await token.getPastVotes(investorB, snapshotBlock)).to.equal(0n);
      expect(await token.balanceOf(investorA)).to.equal(70n);
    });

    it("transfer setelah penutupan tidak mengubah saldo snapshot maupun bagian pemegang", async function () {
      const { token, ledger, asOperator, investorA, investorB } = await networkHelpers.loadFixture(fixtureWithHolders);

      await asOperator.closePeriod(PERIOD);
      const { snapshotBlock } = await ledger.periods(PERIOD);
      const shareBefore = await ledger.shareOf(PERIOD, await token.getPastVotes(investorA, snapshotBlock));

      await token.connect(investorA).transfer(investorB, 100n);
      await networkHelpers.mine();

      expect(await token.getPastVotes(investorA, snapshotBlock)).to.equal(100n);
      expect(await ledger.shareOf(PERIOD, await token.getPastVotes(investorA, snapshotBlock))).to.equal(shareBefore);
      expect(shareBefore).to.equal(MANUAL.shareOf100Tokens);
    });

    it("blok penutupan sendiri belum bisa dipakai getPastVotes di dalam blok itu", async function () {
      const { token, investorA } = await networkHelpers.loadFixture(fixtureWithHolders);

      // Ini alasan closePeriod tidak memakai block.number: nilai yang sama akan
      // gagal bila dipakai untuk memanggil getPastTotalSupply dari dalam kontrak.
      const currentBlock = (await ethers.provider.getBlockNumber()) + 1;
      await expect(token.getPastVotes(investorA, currentBlock, { blockTag: "pending" }))
        .to.be.revertedWithCustomError(token, "ERC5805FutureLookup")
        .withArgs(BigInt(currentBlock), BigInt(currentBlock));
    });
  });

  describe("shareOf", function () {
    it("menolak periode yang belum ditutup", async function () {
      const fixture = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const { ledger } = fixture;

      await expect(ledger.shareOf(PERIOD, 100n))
        .to.be.revertedWithCustomError(ledger, "PeriodNotClosed")
        .withArgs(BigInt(PERIOD));

      await recordCaseStudy(fixture);
      await expect(ledger.shareOf(PERIOD, 100n))
        .to.be.revertedWithCustomError(ledger, "PeriodNotClosed")
        .withArgs(BigInt(PERIOD));
    });

    it("saldo 0 mendapat 0 dan seluruh suplai mendapat seluruh sewa bersih", async function () {
      const fixture = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const { ledger, asOperator } = fixture;

      await recordCaseStudy(fixture);
      await asOperator.closePeriod(PERIOD);

      expect(await ledger.shareOf(PERIOD, 0n)).to.equal(0n);
      expect(await ledger.shareOf(PERIOD, TOTAL_SUPPLY)).to.equal(MANUAL.netRent);
    });

    it("membulatkan per pemegang, bukan dari nilai per token", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      // Sewa bersih 741.010 (lihat test pembulatan di closePeriod).
      await asOperator.recordRent(3, PERIOD, 1_000_019n, ref(rentOrderId(3)));
      await asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 7n, receipt("kecil"));
      await asOperator.closePeriod(PERIOD);

      // 741.010 / 18.000 = 41,167: 1 token mendapat 41.
      expect(await ledger.shareOf(PERIOD, 1n)).to.equal(41n);
      // 741.010 x 7 / 18.000 = 288,17: 7 token mendapat 288, bukan 7 x 41 = 287.
      expect(await ledger.shareOf(PERIOD, 7n)).to.equal(288n);
    });

    it("jumlah bagian semua pemegang + sisa pembulatan sama dengan sewa bersih", async function () {
      const fixture = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const { token, ledger, asOperator, asTokenOperator, originalOwner, treasury, investorA } = fixture;

      await asTokenOperator.setKycStatus(investorA, true);
      await asTokenOperator.transferFromTreasury(investorA, 1_799n, ref("BUY-SMR01-0001"));
      await asTokenOperator.transferFromTreasury(originalOwner, 1n, ref("BUY-SMR01-0002"));
      await asOperator.recordRent(3, PERIOD, 1_000_019n, ref(rentOrderId(3)));
      await asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 7n, receipt("kecil"));
      await asOperator.closePeriod(PERIOD);

      const { netRent, snapshotBlock } = await ledger.periods(PERIOD);
      const balances = await Promise.all(
        [originalOwner, investorA, treasury].map((holder) => token.getPastVotes(holder, snapshotBlock)),
      );
      expect(balances).to.deep.equal([5_401n, 1_799n, 10_800n]);

      // Hitungan manual: 741.010 x 5.401 / 18.000 = 222.344,17 -> 222.344
      //                  741.010 x 1.799 / 18.000 =  74.059,83 ->  74.059
      //                  741.010 x 10.800 / 18.000 = 444.606
      const shares = await Promise.all(balances.map((balance) => ledger.shareOf(PERIOD, balance)));
      expect(shares).to.deep.equal([222_344n, 74_059n, 444_606n]);

      // Sisa Rp1 ini yang dicatat backend sebagai cadangan periode.
      expect(netRent - shares.reduce((sum, share) => sum + share, 0n)).to.equal(1n);
    });
  });

  describe("Jeda darurat", function () {
    it("operator dan admin bisa menjeda dan melanjutkan", async function () {
      const { ledger, asOperator, admin, operator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await expect(asOperator.pause()).to.emit(ledger, "Paused").withArgs(operator.address);
      await expect(ledger.connect(admin).unpause()).to.emit(ledger, "Unpaused").withArgs(admin.address);
      await expect(ledger.connect(admin).pause()).to.emit(ledger, "Paused").withArgs(admin.address);
      await expect(asOperator.unpause()).to.emit(ledger, "Unpaused").withArgs(operator.address);
      expect(await ledger.paused()).to.equal(false);
    });

    it("semua fungsi tulis gagal saat dijeda dan berjalan lagi sesudahnya", async function () {
      const fixture = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const { ledger, asOperator } = fixture;
      const paymentRef = ref(rentOrderId(3));
      const receiptHash = receipt("listrik november");

      await asOperator.recordRent(4, PERIOD, MONTHLY_RENT, ref(rentOrderId(4)));
      await asOperator.pause();

      await expect(asOperator.recordRent(3, PERIOD, MONTHLY_RENT, paymentRef)).to.be.revertedWithCustomError(
        ledger,
        "EnforcedPause",
      );
      await expect(
        asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 1n, receiptHash),
      ).to.be.revertedWithCustomError(ledger, "EnforcedPause");
      await expect(asOperator.closePeriod(PERIOD)).to.be.revertedWithCustomError(ledger, "EnforcedPause");

      await asOperator.unpause();

      await asOperator.recordRent(3, PERIOD, MONTHLY_RENT, paymentRef);
      await asOperator.recordExpense(PERIOD, CATEGORY_OPERATIONS, 1n, receiptHash);
      await asOperator.closePeriod(PERIOD);
      expect((await ledger.periods(PERIOD)).closed).to.equal(true);
    });

    it("fungsi baca tetap berjalan saat dijeda", async function () {
      const fixture = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const { ledger, asOperator } = fixture;

      await recordCaseStudy(fixture);
      await asOperator.closePeriod(PERIOD);
      await asOperator.pause();

      expect(await ledger.shareOf(PERIOD, 100n)).to.equal(MANUAL.shareOf100Tokens);
      expect(await ledger.isPaymentRefRecorded(ref(rentOrderId(3)))).to.equal(true);
      expect(await ledger.isRentRecorded(3, PERIOD)).to.equal(true);
    });

    it("menolak jeda ganda dan unpause saat tidak dijeda", async function () {
      const { ledger, asOperator } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await expect(asOperator.unpause()).to.be.revertedWithCustomError(ledger, "ExpectedPause");
      await asOperator.pause();
      await expect(asOperator.pause()).to.be.revertedWithCustomError(ledger, "EnforcedPause");
    });

    it("prosedur darurat: admin menjeda, mencabut peran operator lama, memasang operator baru, lalu melanjutkan", async function () {
      const { ledger, roles, admin, operator, investorA: newOperator } =
        await networkHelpers.loadFixture(deployKosLedgerFixture);
      const asAdmin = ledger.connect(admin);
      const paymentRef = ref(rentOrderId(3));

      await asAdmin.pause();
      await asAdmin.revokeRole(roles.operator, operator);
      await asAdmin.revokeRole(roles.pauser, operator);

      await expect(ledger.connect(operator).unpause())
        .to.be.revertedWithCustomError(ledger, "AccessControlUnauthorizedAccount")
        .withArgs(operator.address, roles.pauser);

      await asAdmin.grantRole(roles.operator, newOperator);
      await asAdmin.grantRole(roles.pauser, newOperator);
      await asAdmin.unpause();

      await expect(ledger.connect(operator).recordRent(3, PERIOD, MONTHLY_RENT, paymentRef))
        .to.be.revertedWithCustomError(ledger, "AccessControlUnauthorizedAccount")
        .withArgs(operator.address, roles.operator);
      await ledger.connect(newOperator).recordRent(3, PERIOD, MONTHLY_RENT, paymentRef);
      expect(await ledger.isPaymentRefRecorded(paymentRef)).to.equal(true);
    });
  });

  describe("Kontrol akses", function () {
    it("pihak luar ditolak di pause dan unpause", async function () {
      const { ledger, roles, outsider } = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const asOutsider = ledger.connect(outsider);

      await expect(asOutsider.pause())
        .to.be.revertedWithCustomError(ledger, "AccessControlUnauthorizedAccount")
        .withArgs(outsider.address, roles.pauser);
      await expect(asOutsider.unpause())
        .to.be.revertedWithCustomError(ledger, "AccessControlUnauthorizedAccount")
        .withArgs(outsider.address, roles.pauser);
    });

    it("operator tidak bisa memberi peran ke siapa pun", async function () {
      const { ledger, roles, asOperator, operator, outsider } = await networkHelpers.loadFixture(deployKosLedgerFixture);

      await expect(asOperator.grantRole(roles.operator, outsider))
        .to.be.revertedWithCustomError(ledger, "AccessControlUnauthorizedAccount")
        .withArgs(operator.address, roles.admin);
    });

    it("admin bisa menambah operator baru yang langsung bisa mencatat", async function () {
      const { ledger, roles, admin, outsider } = await networkHelpers.loadFixture(deployKosLedgerFixture);
      const paymentRef = ref(rentOrderId(3));

      await ledger.connect(admin).grantRole(roles.operator, outsider);
      await ledger.connect(outsider).recordRent(3, PERIOD, MONTHLY_RENT, paymentRef);

      expect(await ledger.isPaymentRefRecorded(paymentRef)).to.equal(true);
    });
  });
});
