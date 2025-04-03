import { BILL_TYPE } from '@prisma/client';
import getCreditSMSMessage from './creditSms';
import getDebitSMSMessage from './debitSms';

export function getSMSAlertMessage(
  amount: string,
  recipient: string,
  sender: string,
  trxId: string,
  date: string,
  balance: number,
  type: BILL_TYPE | 'transfer',
  details?: {
    isCredit?: boolean;
  },
  accountNumber?: string,
  receipientOrSenderAccountNumber?: string,
  receipientOrSenderBankName?: string,
  validity?: string,
  token?: string,
) {
  // If specifically marked as credit transaction, return credit message
  if (details?.isCredit) {
    return getCreditSMSMessage(type, {
      amount,
      recipient,
      sender,
      trxId,
      date,
      balance,
      validity,
      accountNumber,
      senderAccountNumber: receipientOrSenderAccountNumber,
      senderBankName: receipientOrSenderBankName,
    });
  }

  return getDebitSMSMessage(type, {
    amount,
    recipient,
    trxId,
    date,
    balance,
    validity,
    accountNumber,
    receipientAccountNumber: receipientOrSenderAccountNumber,
    receipientBankName: receipientOrSenderBankName,
    token,
  });
}
