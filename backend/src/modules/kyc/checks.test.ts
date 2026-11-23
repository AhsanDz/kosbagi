import { describe, expect, it } from 'vitest';
import { type ActiveSubmission, computeKycChecks } from './checks.js';

const submission = { id: 'kyc-1', userId: 'user-1', fullName: 'Dimas Pratama', dummyIdNumber: 'DUMMY-0042' };
const self: ActiveSubmission = { id: 'kyc-1', userId: 'user-1', dummyIdNumber: 'DUMMY-0042' };

describe('computeKycChecks', () => {
  it('pengajuan yang wajar lolos ketiga cek', () => {
    expect(computeKycChecks(submission, 'Dimas Pratama', [self])).toEqual({
      dummyPrefix: true,
      nameMatchesAccount: true,
      noOtherActive: true,
    });
  });

  it('nama tidak membedakan huruf besar kecil dan spasi di tepi', () => {
    expect(computeKycChecks({ ...submission, fullName: '  dimas PRATAMA ' }, 'Dimas Pratama', []).nameMatchesAccount).toBe(true);
    expect(computeKycChecks({ ...submission, fullName: 'Dimas P.' }, 'Dimas Pratama', []).nameMatchesAccount).toBe(false);
  });

  it('nomor tanpa awalan DUMMY- gagal cek pertama', () => {
    expect(computeKycChecks({ ...submission, dummyIdNumber: 'dummy-0042' }, 'Dimas Pratama', []).dummyPrefix).toBe(false);
  });

  it('pengajuan lain yang masih berlaku dari akun yang sama gagal cek ketiga', () => {
    const other: ActiveSubmission = { id: 'kyc-2', userId: 'user-1', dummyIdNumber: 'DUMMY-0099' };
    expect(computeKycChecks(submission, 'Dimas Pratama', [self, other]).noOtherActive).toBe(false);
  });

  it('nomor identitas yang sama dipakai akun lain gagal cek ketiga', () => {
    const other: ActiveSubmission = { id: 'kyc-3', userId: 'user-2', dummyIdNumber: 'dummy-0042 ' };
    expect(computeKycChecks(submission, 'Dimas Pratama', [self, other]).noOtherActive).toBe(false);
  });

  it('pengajuan itu sendiri tidak dihitung', () => {
    expect(computeKycChecks(submission, 'Dimas Pratama', [self]).noOtherActive).toBe(true);
  });
});
