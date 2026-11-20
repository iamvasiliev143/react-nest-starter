export interface UserIdentity {
  id: string;
  referralCode: string;
}

export interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
  isPremium: boolean;
  photoUrl?: string;
}
