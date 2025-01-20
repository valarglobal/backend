interface EmailOptions {
  to: string;
  subject: string;
  template: string; // this is the template name
  context?: any;
}

interface safeHavenCreateAccount {
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  emailAddress: string;
  externalReference: string;
  bvn: string;
  verificationId?: string;
  otpCode?: string;
}

interface safeHavenInitiateVerification {
  type: string;
  number: string;
  debitAccountNumber: string;
}

interface safeHavenValidateVerification {
  identityId: string;
  type: string;
  otp: string;
}
