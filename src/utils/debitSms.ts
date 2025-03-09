const getTransferDebitSMSMessage = (
  amount: string,
  recipient: string,
  _trxId: string,
  date: string,
  balance: number,
  accountNumber: string,
  receipientAccountNumber: string,
  receipientBanKName: string,
): string => {
  return `DEBIT\nAmt: NGN ${amount}\nAcct No: ${accountNumber}\nRecipient: ${recipient} ${receipientAccountNumber}\nDesc: TRANSFER TO ${receipientBanKName}-\nBal: ${balance}\nDate: ${date}\nNattyPaySmartBanking`;
};

const getAirtimeDebitSMSMessage = (
  amount: string,
  phone: string,
  _trxId: string,
  date: string,
  balance: number,
  accountNumber: string,
): string => {
  return `DEBIT\nAmt: NGN ${amount}\nAcct No: ${accountNumber}\nRecipient: ${phone}\nDesc: AIRTIME PURCHASE-\nBal: ${balance}\nDate: ${date}\nNattyPaySmartBanking`;
};

const getElectricityDebitSMSMessage = (
  amount: string,
  meterNumber: string,
  token: string,
  _txId: string,
  date: string,
  balance: number,
  accountNumber: string,
): string => {
  return `DEBIT\nAmt: NGN ${amount}\nAcct No: ${accountNumber}\nRecipient: ${meterNumber}\nToken: ${token}\nDesc: ELECTRICITY PURCHASE-\nBal: ${balance}\nDate: ${date}\nNattyPaySmartBanking`;
};

const getGiftCardDebitSMSMessage = (
  amount: string,
  phone: string,
  _txId: string,
  date: string,
  balance: number,
  accountNumber: string,
): string => {
  return `DEBIT\nAmt: NGN ${amount}\nAcct No: ${accountNumber}\nRecipient: ${phone}\nDesc: GIFTCARD PURCHASE-\nBal: ${balance}\nDate: ${date}\nNattyPaySmartBanking`;
};

const getDataDebitSMSMessage = (
  amount: string,
  phone: string,
  _txId: string,
  date: string,
  balance: number,
  accountNumber: string,
): string => {
  return `DEBIT\nAmt: NGN ${amount}\nAcct No: ${accountNumber}\nRecipient: ${phone}\nDesc: DATA PURCHASE-\nBal: ${balance}\nDate: ${date}\nNattyPaySmartBanking`;
};

const getCableDebitSMSMessage = (
  amount: string,
  recipient: string,
  _trxId: string,
  date: string,
  balance: number,
  accountNumber: string,
): string => {
  return `DEBIT\nAmt: NGN ${amount}\nAcct No: ${accountNumber}\nRecipient: ${recipient}\nDesc: CABLE PURCHASE-\nBal: ${balance}\nDate: ${date}\nNattyPaySmartBanking`;
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
    accountNumber?: string;
    receipientAccountNumber?: string;
    receipientBankName?: string;
    token?: string;
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
        data.accountNumber,
        data.receipientAccountNumber,
        data.receipientBankName,
      );
    case 'data':
      return getDataDebitSMSMessage(
        data.amount,
        data.recipient,
        data.trxId,
        data.date,
        data.balance,
        data.accountNumber,
      );
    case 'airtime':
      return getAirtimeDebitSMSMessage(
        data.amount,
        data.recipient,
        data.trxId,
        data.date,
        data.balance,
        data.accountNumber,
      );
    case 'giftcard':
      return getGiftCardDebitSMSMessage(
        data.amount,
        data.recipient,
        data.trxId,
        data.date,
        data.balance,
        data.accountNumber,
      );
    case 'electricity':
      return getElectricityDebitSMSMessage(
        data.amount,
        data.recipient,
        data.token,
        data.trxId,
        data.date,
        data.balance,
        data.accountNumber,
      );
    case 'cable':
      return getCableDebitSMSMessage(
        data.amount,
        data.recipient,
        data.trxId,
        data.date,
        data.balance,
        data.accountNumber,
      );
    default:
      return '[ALERT] Transaction processed. Txn ID: [TXNID]. Date: [DATE]. Check your app for details.';
  }
}
