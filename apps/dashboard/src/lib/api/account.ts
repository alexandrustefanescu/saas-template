import { api } from "./client";

export type AccountUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export type MeResponse = {
  user: AccountUser;
  session: {
    id: string;
  };
};

export function getMe() {
  return api<MeResponse>("/v1/me");
}
