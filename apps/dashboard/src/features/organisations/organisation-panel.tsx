import { useCallback, useEffect, useState } from "react";
import { Form } from "@react-spectrum/s2/Form";
import { Picker, PickerItem } from "@react-spectrum/s2/Picker";
import { TextField } from "@react-spectrum/s2/TextField";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Button } from "#/components/button";
import { Body, SectionTitle } from "#/components/typography";
import { activeOrganizationIdFromSession, authClient } from "#/lib/auth-client";
import { spectrumStyles } from "#/spectrum-styles";

const section = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "start",
  gap: 16,
  width: "full",
  boxSizing: "border-box",
});

const list = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  width: "full",
  maxWidth: 640,
});

const row = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  width: "full",
  padding: 12,
  borderRadius: "lg",
  backgroundColor: "gray-100",
  boxSizing: "border-box",
});

type MemberRow = {
  id: string;
  role: string;
  userId?: string;
  user?: { email?: string; name?: string } | null;
};

type InvitationRow = {
  id: string;
  email: string;
  role: string;
  status: string;
};

export function OrganisationPanel() {
  const { data: sessionData } = authClient.useSession();
  const activeOrgId = activeOrganizationIdFromSession(sessionData);

  const [orgName, setOrgName] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviting, setInviting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!activeOrgId) {
      setOrgName(null);
      setMembers([]);
      setInvitations([]);
      return;
    }

    setLoading(true);
    try {
      const [orgResult, membersResult, invitationsResult] = await Promise.all([
        authClient.organization.getFullOrganization({
          query: { organizationId: activeOrgId },
        }),
        authClient.organization.listMembers({
          query: { organizationId: activeOrgId },
        }),
        authClient.organization.listInvitations({
          query: { organizationId: activeOrgId },
        }),
      ]);

      if (orgResult.error) {
        ToastQueue.negative(orgResult.error.message || "Could not load organisation.", {
          timeout: 5000,
        });
      } else {
        setOrgName((orgResult.data as { name?: string } | null)?.name ?? null);
      }

      if (membersResult.error) {
        ToastQueue.negative(membersResult.error.message || "Could not load members.", {
          timeout: 5000,
        });
        setMembers([]);
      } else {
        const payload = membersResult.data as { members?: MemberRow[] } | MemberRow[] | null;
        const rows = Array.isArray(payload) ? payload : (payload?.members ?? []);
        setMembers(rows);
      }

      if (invitationsResult.error) {
        setInvitations([]);
      } else {
        const rows = (invitationsResult.data as InvitationRow[] | null) ?? [];
        setInvitations(rows.filter((row) => row.status === "pending"));
      }
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!activeOrgId) {
    return (
      <section className={section} aria-labelledby="settings-organisation-heading">
        <SectionTitle id="settings-organisation-heading">Organisation</SectionTitle>
        <Body>
          Select or create an organisation with the switcher in the sidebar before managing members
          and invitations.
        </Body>
      </section>
    );
  }

  return (
    <section className={section} aria-labelledby="settings-organisation-heading">
      <SectionTitle id="settings-organisation-heading">Organisation</SectionTitle>
      <Body>
        {orgName ? (
          <>
            Members and invitations for <strong>{orgName}</strong>. Invitation emails are logged on
            the API in local development and are not delivered by SMTP yet.
          </>
        ) : (
          "Members and invitations for the active organisation."
        )}
      </Body>

      <div className={list} aria-busy={loading}>
        <Body>Members</Body>
        {members.length === 0 && !loading ? (
          <Body>No members found.</Body>
        ) : (
          members.map((member) => {
            const label = member.user?.email ?? member.user?.name ?? member.userId ?? member.id;
            return (
              <div key={member.id} className={row}>
                <span>{label}</span>
                <span className={style({ font: "ui-xs", color: "gray-600" })}>{member.role}</span>
              </div>
            );
          })
        )}
      </div>

      <Form
        styles={spectrumStyles(
          style({
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: "full",
            maxWidth: 480,
          }),
        )}
        onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            const email = inviteEmail.trim();
            if (!email) {
              ToastQueue.negative("Email is required.", { timeout: 4000 });
              return;
            }
            setInviting(true);
            try {
              const { error } = await authClient.organization.inviteMember({
                email,
                role: inviteRole,
                organizationId: activeOrgId,
              });
              if (error) {
                ToastQueue.negative(error.message || "Could not send invitation.", {
                  timeout: 5000,
                });
                return;
              }
              ToastQueue.positive("Invitation created.", { timeout: 4000 });
              setInviteEmail("");
              await refresh();
            } finally {
              setInviting(false);
            }
          })();
        }}
      >
        <Body>Invite a member</Body>
        <TextField
          label="Email"
          type="email"
          value={inviteEmail}
          onChange={setInviteEmail}
          isRequired
          data-testid="organisation-invite-email"
        />
        <Picker
          label="Role"
          selectedKey={inviteRole}
          onSelectionChange={(key) => {
            if (key === "admin" || key === "member") setInviteRole(key);
          }}
          data-testid="organisation-invite-role"
        >
          <PickerItem id="member">Member</PickerItem>
          <PickerItem id="admin">Admin</PickerItem>
        </Picker>
        <Button
          type="submit"
          variant="accent"
          isPending={inviting}
          data-testid="organisation-invite-submit"
        >
          Send invitation
        </Button>
      </Form>

      <div className={list}>
        <Body>Pending invitations</Body>
        {invitations.length === 0 ? (
          <Body>No pending invitations.</Body>
        ) : (
          invitations.map((invitation) => (
            <div key={invitation.id} className={row}>
              <span>
                {invitation.email} · {invitation.role}
              </span>
              <Button
                variant="secondary"
                isPending={cancellingId === invitation.id}
                onPress={() => {
                  void (async () => {
                    setCancellingId(invitation.id);
                    try {
                      const { error } = await authClient.organization.cancelInvitation({
                        invitationId: invitation.id,
                      });
                      if (error) {
                        ToastQueue.negative(error.message || "Could not cancel invitation.", {
                          timeout: 5000,
                        });
                        return;
                      }
                      ToastQueue.positive("Invitation cancelled.", { timeout: 4000 });
                      await refresh();
                    } finally {
                      setCancellingId(null);
                    }
                  })();
                }}
              >
                Cancel
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
