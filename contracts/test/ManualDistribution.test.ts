import { readFile } from "node:fs/promises";

import { expect } from "chai";
import { network } from "hardhat";

import SepoliaDeployment from "../ignition/modules/SepoliaDeployment.js";
import { MODULE_ID } from "../scripts/lib/deploy-target.js";

/*
 * Skenario uji 12 dengan fixture perhitungan manual jalur 1
 * (test/fixtures/distribusi-manual.json, langkah hitungnya di
 * docs/bisnis/perhitungan-distribusi.md). Fixture yang sama dipakai kalkulator
 * backend/src/finance/, jadi kontrak dan kalkulator dibandingkan dengan angka
 * yang sama. Setiap kasus berjalan di kontrak hasil modul deploy Sepolia:
 * saldo pemegang dibentuk lewat transferFromTreasury, sewa dan biaya dicatat
 * oleh operator, lalu periode ditutup.
 */

const { ethers, ignition, networkHelpers } = await network.create();

interface FixtureHolder {
  label: string;
  balance: number;
  share: number;
}

interface FixtureCase {
  id: string;
  description: string;
  period: number;
  rents: { room: number; amount: number }[];
  grossRent: number;
  totalExpenses: number;
  platformFee: number;
  taxableProfit: number;
  tax: number;
  netRent: number;
  valuePerTokenSen: number;
  deficit: number;
  holders: FixtureHolder[];
  totalShares: number;
  reserve: number;
}

interface DistributionFixture {
  parameters: { platformFeeBps: number; taxBps: number; totalSupply: number };
  cases: FixtureCase[];
}

const fixture = JSON.parse(
  await readFile(new URL("./fixtures/distribusi-manual.json", import.meta.url), "utf8"),
) as DistributionFixture;

const OWNER_LABEL = "Pemilik lama";
const CATEGORY_OPERATIONS = 1;

/** Alamat dompet kustodian contoh per label pemegang, tetap di setiap run. */
function holderAddress(label: string): string {
  return ethers.computeAddress(ethers.id(`KosBagi fixture skenario 12: ${label}`));
}

function rentOrderId(room: number, period: number): string {
  const text = String(period);
  return `RENT-SMR01-K${String(room).padStart(2, "0")}-${text.slice(0, 4)}-${text.slice(4)}`;
}

async function deployFixture() {
  const [admin, operator, originalOwner, treasury] = await ethers.getSigners();
  const deployed = await ignition.deploy(SepoliaDeployment, {
    parameters: {
      [MODULE_ID]: {
        admin: admin.address,
        operator: operator.address,
        originalOwner: originalOwner.address,
        treasury: treasury.address,
        platformFeeBps: BigInt(fixture.parameters.platformFeeBps),
        taxBps: BigInt(fixture.parameters.taxBps),
        certificateHash: ethers.sha256(ethers.toUtf8Bytes("contoh: sertifikat")),
        appraisalReportHash: ethers.sha256(ethers.toUtf8Bytes("contoh: laporan penilaian")),
        managementAgreementHash: ethers.sha256(ethers.toUtf8Bytes("contoh: perjanjian pengelolaan")),
      },
    },
    defaultSender: admin.address,
  });
  const token = (await ethers.getContractAt("KosToken", await deployed.token.getAddress())).connect(operator);
  const ledger = (await ethers.getContractAt("KosLedger", await deployed.ledger.getAddress())).connect(operator);
  return { token, ledger, originalOwner, treasury };
}

/** Membentuk saldo pemegang sesuai fixture, mencatat sewa dan biaya, lalu menutup periode. */
async function runCase(testCase: FixtureCase) {
  const { token, ledger, originalOwner, treasury } = await networkHelpers.loadFixture(deployFixture);

  const holders = testCase.holders.map((holder) => ({
    ...holder,
    address: holder.label === OWNER_LABEL ? originalOwner.address : holderAddress(holder.label),
  }));
  for (const holder of holders) {
    if (holder.label === OWNER_LABEL) continue;
    await token.setKycStatus(holder.address, true);
    await token.transferFromTreasury(holder.address, holder.balance, ethers.id(`BUY-SMR01-${testCase.id}-${holder.label}`));
  }

  for (const rent of testCase.rents) {
    await ledger.recordRent(rent.room, testCase.period, rent.amount, ethers.id(rentOrderId(rent.room, testCase.period)));
  }
  if (testCase.totalExpenses > 0) {
    await ledger.recordExpense(
      testCase.period,
      CATEGORY_OPERATIONS,
      testCase.totalExpenses,
      ethers.sha256(ethers.toUtf8Bytes(`contoh: nota ${testCase.id}`)),
    );
  }
  await ledger.closePeriod(testCase.period);

  return { token, ledger, holders, treasury, record: await ledger.periods(testCase.period) };
}

describe("Skenario 12: fixture perhitungan manual jalur 1", function () {
  it("parameter fixture sama dengan parameter deploy KB-SMR01", async function () {
    const { token, ledger } = await networkHelpers.loadFixture(deployFixture);

    expect(fixture.parameters.platformFeeBps).to.equal(Number(await ledger.platformFeeBps()));
    expect(fixture.parameters.taxBps).to.equal(Number(await ledger.taxBps()));
    expect(fixture.parameters.totalSupply).to.equal(Number(await token.totalSupply()));
    expect(fixture.cases).to.have.length.greaterThan(0);
  });

  for (const testCase of fixture.cases) {
    describe(`Kasus ${testCase.id}`, function () {
      it("fixture konsisten: sewa kotor = jumlah sewa, saldo pemegang = total suplai, bagian + cadangan = sewa bersih", function () {
        const rentTotal = testCase.rents.reduce((sum, rent) => sum + rent.amount, 0);
        const balanceTotal = testCase.holders.reduce((sum, holder) => sum + holder.balance, 0);
        const shareTotal = testCase.holders.reduce((sum, holder) => sum + holder.share, 0);

        expect(rentTotal, "jumlah rents").to.equal(testCase.grossRent);
        expect(balanceTotal, "jumlah saldo holders").to.equal(fixture.parameters.totalSupply);
        expect(shareTotal, "jumlah share holders").to.equal(testCase.totalShares);
        expect(testCase.totalShares + testCase.reserve, "bagian + cadangan").to.equal(testCase.netRent);
        expect(testCase.holders.filter((holder) => holder.label === OWNER_LABEL)).to.have.length(1);
        expect(new Set(testCase.holders.map((holder) => holder.label)).size).to.equal(testCase.holders.length);
      });

      it("closePeriod menyimpan semua angka periode sama dengan hitungan manual", async function () {
        const { record } = await runCase(testCase);

        expect(record.closed).to.equal(true);
        expect(record.grossRent).to.equal(BigInt(testCase.grossRent));
        expect(record.totalExpenses).to.equal(BigInt(testCase.totalExpenses));
        expect(record.platformFee).to.equal(BigInt(testCase.platformFee));
        expect(record.tax).to.equal(BigInt(testCase.tax));
        expect(record.netRent).to.equal(BigInt(testCase.netRent));
        expect(record.totalSupply).to.equal(BigInt(fixture.parameters.totalSupply));
        expect(record.valuePerTokenSen).to.equal(BigInt(testCase.valuePerTokenSen));

        // Laba kena pajak dan defisit tidak disimpan kontrak, tetapi bisa diturunkan dari field yang disimpan.
        expect(record.netRent + record.tax).to.equal(BigInt(testCase.taxableProfit));
        const afterFeeAndExpenses = record.grossRent - record.platformFee - record.totalExpenses;
        expect(afterFeeAndExpenses < 0n ? -afterFeeAndExpenses : 0n).to.equal(BigInt(testCase.deficit));
      });

      it("saldo snapshot dan shareOf tiap pemegang sama dengan fixture, sisanya = cadangan", async function () {
        const { token, ledger, holders, treasury, record } = await runCase(testCase);

        let totalShares = 0n;
        for (const holder of holders) {
          const snapshotBalance = await token.getPastVotes(holder.address, record.snapshotBlock);
          expect(snapshotBalance, `saldo ${holder.label}`).to.equal(BigInt(holder.balance));

          const share = await ledger.shareOf(testCase.period, snapshotBalance);
          expect(share, `bagian ${holder.label}`).to.equal(BigInt(holder.share));
          totalShares += share;
        }
        // Seluruh stok perbendaharaan sudah terjual di semua kasus fixture.
        expect(await token.getPastVotes(treasury.address, record.snapshotBlock)).to.equal(0n);

        expect(totalShares).to.equal(BigInt(testCase.totalShares));
        expect(record.netRent - totalShares).to.equal(BigInt(testCase.reserve));
      });
    });
  }
});
