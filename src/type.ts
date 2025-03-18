interface EmailOptions {
  to: string;
  subject: string;
  template: string; // this is the template name
  context?: any;
}

interface SafeHavenAccount {
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  emailAddress: string;
  externalReference: string;
  bvn: string;
  verificationId?: string;
  otpCode?: string;
}

interface safeHavenCreateAccount extends SafeHavenAccount {
  companyRegistrationNumber?: string;
}

interface safeHavenCreateBusinessAccount extends SafeHavenAccount {
  companyRegistrationNumber: string;
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
