export type AssignableAccountRole =
  | "INSTRUCTOR"
  | "GUARDIAN";

export type AssignableAccount = {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  membershipStatus:
    | "ACTIVE"
    | "INVITED"
    | "SUSPENDED"
    | "ARCHIVED";
};
