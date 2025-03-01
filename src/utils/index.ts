import getCreditSMSMessage from './creditSms';
import getDebitSMSMessage from './debitSms';

export default function getSMSAlertMessage(
  amount: string,
  recipient: string,
  sender: string,
  trxId: string,
  date: string,
  balance: number,
  type:
    | 'transfer'
    | 'data'
    | 'airtime'
    | 'giftcard'
    | 'card'
    | 'electricity'
    | 'credit',
  details?: {
    isCredit?: boolean;
  },
  validity?: string,
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
    });
  }

  return getDebitSMSMessage(type, {
    amount,
    recipient,
    trxId,
    date,
    balance,
    validity,
  });
}
