/**
 * Who may open the KidsAi site on Azure (Entra ID app "kidsai-web", assignment required).
 *   npm run access -- list
 *   npm run access -- add someone@example.com      (invites outsiders as guests: Microsoft emails them)
 *   npm run access -- remove someone@example.com   (removes site access; the guest account itself stays)
 * Needs the Azure CLI signed in (az login) to the directory that holds the subscription.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SITE_URL = "https://kidsai.purplecliff-668e4cb5.westeurope.azurecontainerapps.io";
const GRAPH = "https://graph.microsoft.com/v1.0";
const DEFAULT_ROLE = "00000000-0000-0000-0000-000000000000";

// On Windows call the CLI's Python directly: az.cmd goes through cmd.exe, which mangles & and %.
const WIN_PY = "C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\python.exe";
const [cmd, prefix] = process.platform === "win32" && existsSync(WIN_PY) ? [WIN_PY, ["-IBm", "azure.cli"]] : ["az", []];

function az(args: string[]): string {
  return execFileSync(cmd, [...prefix, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
}

function graph<T = { value: unknown[] }>(method: "get" | "post" | "delete", url: string, body?: unknown): T {
  if (body === undefined) {
    const out = az(["rest", "--method", method, "--url", url, "-o", "json"]);
    return (out ? JSON.parse(out) : {}) as T;
  }
  const dir = mkdtempSync(path.join(tmpdir(), "kidsai-"));
  const file = path.join(dir, "body.json");
  try {
    writeFileSync(file, JSON.stringify(body));
    const out = az(["rest", "--method", method, "--url", url, "--headers", "Content-Type=application/json", "--body", `@${file}`, "-o", "json"]);
    return (out ? JSON.parse(out) : {}) as T;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

type Assignment = { id: string; principalId: string; principalDisplayName: string; principalType: string };
type User = { id: string; displayName: string };

function findUser(email: string): User | undefined {
  const m = email.toLowerCase().replace(/'/g, "''");
  const filter = encodeURIComponent(`mail eq '${m}' or userPrincipalName eq '${m}' or otherMails/any(x:x eq '${m}')`);
  return graph<{ value: User[] }>("get", `${GRAPH}/users?$filter=${filter}&$select=id,displayName`).value[0];
}

function main() {
  const [action, email] = process.argv.slice(2);
  if (!["list", "add", "remove"].includes(action ?? "") || (action !== "list" && !email)) {
    console.error("Usage: npm run access -- list | add <email> | remove <email>");
    process.exit(1);
  }
  const appId = az(["ad", "app", "list", "--display-name", "kidsai-web", "--query", "[0].appId", "-o", "tsv"]);
  if (!appId) throw new Error("App registration 'kidsai-web' not found: are you signed in to the right directory (az login)?");
  const sp = az(["ad", "sp", "list", "--filter", `appId eq '${appId}'`, "--query", "[0].id", "-o", "tsv"]);
  const assignedUrl = `${GRAPH}/servicePrincipals/${sp}/appRoleAssignedTo`;
  const assignments = () => graph<{ value: Assignment[] }>("get", assignedUrl).value;

  if (action === "list") {
    for (const a of assignments()) console.log(`${a.principalDisplayName}  (${a.principalType})`);
    return;
  }
  if (action === "add") {
    let user = findUser(email);
    if (!user) {
      const inv = graph<{ invitedUser: { id: string } }>("post", `${GRAPH}/invitations`, {
        invitedUserEmailAddress: email, inviteRedirectUrl: SITE_URL, sendInvitationMessage: true,
      });
      user = { id: inv.invitedUser.id, displayName: email };
      console.log(`Invited ${email} as a guest (Microsoft sent an invitation email).`);
    }
    if (assignments().some((a) => a.principalId === user.id)) return console.log(`${email} already has access.`);
    graph("post", assignedUrl, { principalId: user.id, resourceId: sp, appRoleId: DEFAULT_ROLE });
    console.log(`${email} now has access to ${SITE_URL}`);
    return;
  }
  const user = findUser(email);
  const a = user && assignments().find((x) => x.principalId === user.id);
  if (!a) return console.log(`${email} has no access.`);
  graph("delete", `${assignedUrl}/${a.id}`);
  console.log(`${email} no longer has access (an open session ends when its sign-in expires, within about an hour).`);
}

main();
