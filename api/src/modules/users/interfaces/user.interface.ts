export interface UserIdentity {
  id: string;
}

export interface UserProfile extends UserIdentity {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
}
