import { readFile } from "node:fs/promises";

import { expect } from "chai";
import { artifacts, network } from "hardhat";

import LocalDeployment from "../ignition/modules/LocalDeployment.js";

const { ethers, ignition, networkHelpers } = await network.create();

async function deployLocalFixture() {
  return ignition.deploy(LocalDeployment);
}

describe("Modul deploy lokal", function () {
  it("men-deploy KosToken dan KosLedger yang saling terhubung dengan parameter KB-SMR01", async function () {
    const { token, ledger } = await networkHelpers.loadFixture(deployLocalFixture);
    const [admin, operator, originalOwner, treasury] = await ethers.getSigners();

    expect(await token.symbol()).to.equal("KB-SMR01");
    expect(await token.totalSupply()).to.equal(18_000n);
    expect(await token.balanceOf(originalOwner)).to.equal(5_400n);
    expect(await token.balanceOf(treasury)).to.equal(12_600n);

    expect(await ledger.token()).to.equal(await token.getAddress());
    expect(await ledger.platformFeeBps()).to.equal(500n);
    expect(await ledger.taxBps()).to.equal(2_200n);
    expect(await ledger.hasRole(await ledger.DEFAULT_ADMIN_ROLE(), admin)).to.equal(true);
    expect(await ledger.hasRole(await ledger.OPERATOR_ROLE(), operator)).to.equal(true);
  });

  it("hasil deploy bisa langsung menjalankan satu periode", async function () {
    const { ledger } = await networkHelpers.loadFixture(deployLocalFixture);
    const [, operator] = await ethers.getSigners();
    const asOperator = ledger.connect(operator) as typeof ledger;
    const period = 202611;

    await asOperator.recordRent(3, period, 1_500_000n, ethers.id("RENT-SMR01-K03-2026-11"));
    await asOperator.closePeriod(period);

    // 1.500.000 - 75.000 fee = 1.425.000; pajak 22% = 313.500; bersih 1.111.500.
    expect(await ledger.shareOf(period, 18_000n)).to.equal(1_111_500n);
  });
});

describe("Ekspor ABI", function () {
  for (const name of ["KosToken", "KosLedger"]) {
    it(`ABI ${name} di backend sama dengan hasil kompilasi`, async function () {
      const exportedFile = new URL(`../../backend/src/blockchain/abi/${name}.json`, import.meta.url);
      const exported: unknown = JSON.parse(await readFile(exportedFile, "utf8"));
      const { abi } = await artifacts.readArtifact(name);

      expect(exported, "Jalankan `npm run export-abi` setelah kontrak berubah").to.deep.equal(abi);
    });
  }
});
