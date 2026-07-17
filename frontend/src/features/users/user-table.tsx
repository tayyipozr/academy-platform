"use client";

import type { OrganizationUser } from "./types";
import { UserStatusBadge } from "./user-status-badge";

type UserTableProps = {
  users: OrganizationUser[];
  currentMembershipId?: string;
  canUpdate: boolean;
  canDeactivate: boolean;
  statusUpdatingMembershipId?: string | null;
  onEdit: (user: OrganizationUser) => void;
  onSuspend: (user: OrganizationUser) => void;
  onReactivate: (user: OrganizationUser) => void;
};

export function UserTable({
  users,
  currentMembershipId,
  canUpdate,
  canDeactivate,
  statusUpdatingMembershipId,
  onEdit,
  onSuspend,
  onReactivate,
}: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="p-10 text-center text-slate-500">
        No organization users were found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-5 py-3 text-sm font-semibold">
              User
            </th>

            <th className="px-5 py-3 text-sm font-semibold">
              Roles
            </th>

            <th className="px-5 py-3 text-sm font-semibold">
              Status
            </th>

            <th className="px-5 py-3 text-sm font-semibold">
              Joined
            </th>

            <th className="px-5 py-3 text-sm font-semibold">
              Last login
            </th>

            <th className="px-5 py-3 text-sm font-semibold">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200">
          {users.map((user) => {
            const isCurrentUser =
              user.membershipId === currentMembershipId;

            const statusUpdating =
              statusUpdatingMembershipId ===
              user.membershipId;

            return (
              <tr
                key={user.membershipId}
                className="hover:bg-slate-50"
              >
                <td className="px-5 py-4">
                  <div className="font-medium text-slate-900">
                    {user.firstName} {user.lastName}

                    {isCurrentUser && (
                      <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        You
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    {user.email}
                  </div>
                </td>

                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <span
                        key={role.id}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        {role.name}
                      </span>
                    ))}
                  </div>
                </td>

                <td className="px-5 py-4">
                  <UserStatusBadge status={user.status} />
                </td>

                <td className="px-5 py-4 text-sm text-slate-600">
                  {new Date(user.joinedAt).toLocaleDateString()}
                </td>

                <td className="px-5 py-4 text-sm text-slate-600">
                  {user.lastLoginAt
                    ? new Date(
                        user.lastLoginAt,
                      ).toLocaleString()
                    : "Never"}
                </td>

                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => onEdit(user)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                      >
                        Edit
                      </button>
                    )}

                    {user.status === "ACTIVE" &&
                      canDeactivate &&
                      !isCurrentUser && (
                        <button
                          type="button"
                          disabled={statusUpdating}
                          onClick={() => onSuspend(user)}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {statusUpdating
                            ? "Updating..."
                            : "Suspend"}
                        </button>
                      )}

                    {user.status === "SUSPENDED" &&
                      canUpdate && (
                        <button
                          type="button"
                          disabled={statusUpdating}
                          onClick={() => onReactivate(user)}
                          className="rounded-lg border border-green-300 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
                        >
                          {statusUpdating
                            ? "Updating..."
                            : "Reactivate"}
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
