// 
const getTransferDebitSMSMessage = (
  amount: string,
  recipient: string,
  _trxId: string,
  date: string,
  balance: number,
  accountNumber: string,
  receipientAccountNumber: string,
  receipientBanKName: string,
  description?: string,
): string => {
  const narration = description ? `#${description}` : '';
  const descText = `Safe/NIP/TRF@${recipient}${narration}`;

  return `DEBIT\nAmt: NGN ${amount}\nAcct No: ${accountNumber}\nRecipient: ${recipient} ${receipientAccountNumber}\nDesc: ${descText}\nBal: ${balance}\nDate: ${date}\nValarPayBeyondBanking`;
};

const getAirtimeDebitSMSMessage = (
  amount: string,
  phone: string,
  _txId: string,
  date: string,
  balance: number,
  accountNumber: string,
  description?: string,
  network?: string
): string => {

  const descText = `Safe/${network}/Airtime ${amount}/${phone}`;

  return `DEBIT\nAmt: NGN ${amount}\nAcct No: ${accountNumber}\nRecipient: ${phone}\nDesc: ${descText}\nBal: ${balance}\nDate: ${date}\nValarPayBeyondBanking`;
};

const getElectricityDebitSMSMessage = (
  amount: string,
  meterNumber: string,
  token: string,
  _txId: string,
  date: string,
  balance: number,
  accountNumber: string,
  description?: string,
): string => {
  const descriptionText = description ? `\nNarration: ${description}` : '';
  return `DEBIT\nAmt: NGN ${amount}\nAcct No: ${accountNumber}\nRecipient: ${meterNumber}\nToken: ${token}\nDesc: ELECTRICITY PURCHASE-${descriptionText}\nBal: ${balance}\nDate: ${date}\nValarPayBeyondBanking`;
};

const getGiftCardDebitSMSMessage = (
  amount: string,
  phone: string,
  _txId: string,
  date: string,
  balance: number,
  accountNumber: string,
  description?: string,
): string => {
  const descriptionText = description ? `\nNarration: ${description}` : '';
  return `DEBIT\nAmt: NGN ${amount}\nAcct No: ${accountNumber}\nRecipient: ${phone}\nDesc: GIFTCARD PURCHASE-${descriptionText}\nBal: ${balance}\nDate: ${date}\nValarPayBeyondBanking`;
};

const getDataDebitSMSMessage = (
  amount: string,
  phone: string,
  _txId: string,
  date: string,
  balance: number,
  accountNumber: string,
  description?: string,
  network?: string
): string => {
  
  // const descText = `Safe/${network}/Data ${phone}`;
  const descText = `Safe/${network}/Data ${amount}/${phone}`;
  
  return `DEBIT\nAmt: NGN ${amount}\nAcct No: ${accountNumber}\nRecipient: ${phone}\nDesc: ${descText}\nBal: ${balance}\nDate: ${date}\nValarPayBeyondBanking`;
};

const getCableDebitSMSMessage = (
  amount: string,
  recipient: string,
  _trxId: string,
  date: string,
  balance: number,
  accountNumber: string,
  description?: string,
): string => {
  const descriptionText = description ? `\nNarration: ${description}` : '';
  return `DEBIT\nAmt: NGN ${amount}\nAcct No: ${accountNumber}\nRecipient: ${recipient}\nDesc: CABLE PURCHASE-${descriptionText}\nBal: ${balance}\nDate: ${date}\nValarPayBeyondBanking`;
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
    description?: string;
    network?:string
  },
) {
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
        data.description,
      );
    case 'data':
      return getDataDebitSMSMessage(
        data.amount,
        data.recipient,
        data.trxId,
        data.date,
        data.balance,
        data.accountNumber,
        data.description,
        data.network
      );
    case 'airtime':
      return getAirtimeDebitSMSMessage(
        data.amount,
        data.recipient,
        data.trxId,
        data.date,
        data.balance,
        data.accountNumber,
        data.description,
        data.network
      );
    case 'giftcard':
      return getGiftCardDebitSMSMessage(
        data.amount,
        data.recipient,
        data.trxId,
        data.date,
        data.balance,
        data.accountNumber,
        data.description,
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
        data.description,
      );
    case 'cable':
      return getCableDebitSMSMessage(
        data.amount,
        data.recipient,
        data.trxId,
        data.date,
        data.balance,
        data.accountNumber,
        data.description,
      );
    default:
      const descriptionText = data.description ? `. Narration: ${data.description}` : '';
      return `[ALERT] Transaction processed${descriptionText}. Txn ID: ${data.trxId}. Date: ${data.date}. Check your app for details.`;
  }
}
