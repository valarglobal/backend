const getTransferDebitSMSMessage = (
  amount: string,
  recipient: string,
  trxId: string,
  date: string,
  balance: number,
): string => {
  return `[DEBIT] Your account has been debited with ${amount}. Recipient: ${recipient}. Desc: Transfer. Txn ID: ${trxId}. Date: ${date}. Bal: ${balance}.`;
};

const getAirtimeDebitSMSMessage = (
  amount: string,
  phone: string,
  trxId: string,
  date: string,
  balance: number,
): string => {
  return `[DEBIT] Your account has been debited with ${amount}. Desc: Airtime purchase for ${phone}. Txn ID: ${trxId}. Date: ${date}. Bal: ${balance}.`;
};

const getElectricityDebitSMSMessage = (
  amount: string,
  meterNumber: string,
  token: string,
  txId: string,
  date: string,
  balance: number,
  unit?: string,
): string => {
  return '[DEBIT] Your account has been debited with [AMOUNT]. Desc: Electricity bill payment for Meter [METER_NUMBER]. Token: [TOKEN]. Units: [UNITS]. Txn ID: [TXNID]. Date: [DATE]. Bal: [BALANCE].';
};

const getGiftCardDebitSMSMessage = (): string => {
  return '[DEBIT] Your account has been debited with [AMOUNT]. Desc: [BRAND] Gift Card purchase. Card code: [CODE]. Txn ID: [TXNID]. Date: [DATE]. Bal: [BALANCE].';
};

const getDataDebitSMSMessage = (
  amount: string,
  phone: string,
  txId: string,
  date: string,
  balance: number,
  validity: string,
): string => {
  return `[DEBIT] Your account has been debited with ${amount}. Desc: ${amount}MB Data purchase for ${phone}. Validity: ${validity} days. Txn ID: ${txId}. Date: ${date}. Bal: ${balance}.`;
};

export default function getDebitSMSMessage(
  type: string,
  data: {
    amount: string;
    recipient: string;
    trxId: string;
    date: string;
    balance: number;
    validity?: string;
  },
) {
  // Otherwise return appropriate debit message based on type
  switch (type) {
    case 'transfer':
      return getTransferDebitSMSMessage(
        data.amount,
        data.recipient,
        data.trxId,
        data.date,
        data.balance,
      );
    case 'data':
      return getDataDebitSMSMessage(
        data.amount,
        data.recipient,
        data.trxId,
        data.date,
        data.balance,
        data.validity,
      );
    case 'airtime':
      return getAirtimeDebitSMSMessage(
        data.amount,
        data.recipient,
        data.trxId,
        data.date,
        data.balance,
      );
    case 'giftcard':
      return getGiftCardDebitSMSMessage();
    case 'electricity':
    //   return getElectricityDebitSMSMessage();
    default:
      return '[ALERT] Transaction processed. Txn ID: [TXNID]. Date: [DATE]. Check your app for details.';
  }
}
