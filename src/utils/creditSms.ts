// const getTransferCreditSMSMessage = (
//   amount: string,
//   sender: string,
//   _trxId: string,
//   date: string,
//   balance: number,
//   accountNumber: string,
//   senderAccountNumber: string,
//   senderBankName: string,
// ): string => {
//   return `CREDIT\nAmt: NGN ${amount}\nAcct No: ${accountNumber}\nSender: ${sender} ${senderAccountNumber}\nDesc: TRANSFER RECEIVED FROM ${senderBankName}\nBal: ${balance}\nDate: ${date}\nValarPaySmartBanking`;
// };

// const getRefundCreditSMSMessage = (
//   amount: string,
//   service: string,
//   trxId: string,
//   date: string,
//   balance: number,
// ): string => {
//   return `[CREDIT] Your account has been credited with ${amount}. Desc: Refund for ${service}. Txn ID: ${trxId}. Date: ${date}. Bal: ${balance}\nValarPaySmartBanking`;
// };

// export default function getCreditSMSMessage(
//   type: string,
//   data: {
//     amount: string;
//     recipient: string;
//     sender: string;
//     trxId: string;
//     date: string;
//     balance: number;
//     validity?: string;
//     accountNumber?: string;
//     senderAccountNumber?: string;
//     senderBankName?: string;
//   },
// ) {
//   switch (type) {
//     case 'transfer':
//       return getTransferCreditSMSMessage(
//         data.amount,
//         data.sender,
//         data.trxId,
//         data.date,
//         data.balance,
//         data.accountNumber,
//         data.senderAccountNumber,
//         data.senderBankName,
//       );
//     case 'refund':
//       return getRefundCreditSMSMessage(
//         data.amount,
//         data.sender,
//         data.trxId,
//         data.date,
//         data.balance,
//       );
//     default:
//       return `[CREDIT] Your account has been credited with ${data.amount}. Desc: Credit received. Txn ID: ${data.trxId}. Date: ${data.date}. Bal: ${data.balance}.`;
//   }
// }
const getTransferCreditSMSMessage = (
  amount: string,
  sender: string,
  _trxId: string,
  date: string,
  balance: number,
  accountNumber: string,
  senderAccountNumber: string,
  senderBankName: string,
  description?: string,
): string => {
  const narration = description ? `#${description}` : '';
  const descText = `Valar/NIP/Funds Received FRM ${sender}${narration}`;

  return `CREDIT\nAmt: NGN ${amount}\nAcct No: ${accountNumber}\nSender: ${sender} ${senderAccountNumber}\nDesc: ${descText}\nBal: ${balance}\nDate: ${date}\nValarPayBeyondBanking`;
};

const getRefundCreditSMSMessage = (
  amount: string,
  service: string,
  trxId: string,
  date: string,
  balance: number,
  description?: string,
): string => {
  const descriptionText = description ? `. Narration: ${description}` : '';
  
  return `[CREDIT] Your account has been credited with ${amount}. Desc: Refund for ${service}${descriptionText}. Txn ID: ${trxId}. Date: ${date}. Bal: ${balance}\nValarPayBeyondBanking`;
  // return `[CREDIT] Your account has been credited with ${amount}. Desc: Refund for ${service}. Txn ID: ${trxId}. Date: ${date}. Bal: ${balance}\nNattyPaySmartBanking`;
};

export default function getCreditSMSMessage(
  type: string,
  data: {
    amount: string;
    recipient: string;
    sender: string;
    trxId: string;
    date: string;
    balance: number;
    validity?: string;
    accountNumber?: string;
    senderAccountNumber?: string;
    senderBankName?: string;
    description?: string; 
  },
) {
  switch (type) {
    case 'transfer':
      return getTransferCreditSMSMessage(
        data.amount,
        data.sender,
        data.trxId,
        data.date,
        data.balance,
        data.accountNumber,
        data.senderAccountNumber,
        data.senderBankName,
        data.description,
      );
    case 'refund':
      return getRefundCreditSMSMessage(
        data.amount,
        data.sender,
        data.trxId,
        data.date,
        data.balance,
        data.description,
      );
    default:
      const narration = data.description ? `#${data.description}` : '';
      const descText = `Valar/NIP/TRF@${data.sender}${narration}`;
      
      return `CREDIT\nAmt: NGN ${data.amount}\nAcct No: ${data.accountNumber}\nSender: ${data.sender} ${data.senderAccountNumber}\nDesc: ${descText}\nBal: ${data.balance}\nDate: ${data.date}\nValarPayBeyondBanking`;
  }
}
