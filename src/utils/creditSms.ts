const getTransferCreditSMSMessage = (
  amount: string,
  sender: string,
  trxId: string,
  date: string,
  balance: number,
): string => {
  return `[CREDIT] Your account has been credited with ${amount}. Sender: ${sender}. Desc: Transfer Received. Txn ID: ${trxId}. Date: ${date}. Bal: ${balance}.`;
};

const getRefundCreditSMSMessage = (
  amount: string,
  service: string,
  trxId: string,
  date: string,
  balance: number,
): string => {
  return `[CREDIT] Your account has been credited with ${amount}. Desc: Refund for ${service}. Txn ID: ${trxId}. Date: ${date}. Bal: ${balance}.`;
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
      );
    case 'refund':
      return getRefundCreditSMSMessage(
        data.amount,
        data.sender,
        data.trxId,
        data.date,
        data.balance,
      );
    default:
      return `[CREDIT] Your account has been credited with ${data.amount}. Desc: Credit received. Txn ID: ${data.trxId}. Date: ${data.date}. Bal: ${data.balance}.`;
  }
}
