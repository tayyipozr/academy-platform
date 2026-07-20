"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { getCurrentUser } from "@/features/auth/api";
import {
  createInvitation,
  createUser,
  getRoles,
  getUsers,
  reactivateUser,
  suspendUser,
  updateUser,
} from "@/features/users/api";

import { InvitationResultDialog } from "@/features/users/invitation-result-dialog";
import { UserFormDialog } from "@/features/users/user-form-dialog";
import type { UserFormValues } from "@/features/users/user-form-schema";
import { userQueryKeys } from "@/features/users/query-keys";
import { UserTable } from "@/features/users/user-table";

import type {
  OrganizationUser,
  UserInvitationResponse,
} from "@/features/users/types";

import { DashboardHeader } from "@/components/dashboard-header";
import { ApiError } from "@/lib/api/api-client";
import { getApiErrorMessage } from "@/lib/api/error-message";
import {
  hasPermission,
} from "@/lib/permissions";

type DialogState =
  | {
    mode: "create";
  }
  | {
    mode: "invite";
  }
  | {
    mode: "edit";
    user: OrganizationUser;
  }
  | null;

const PAGE_SIZE = 20;

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [dialog, setDialog] =
    useState<DialogState>(null);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [invitationResult, setInvitationResult] =
    useState<UserInvitationResponse | null>(null);

  const [statusUpdatingMembershipId, setStatusUpdatingMembershipId] =
    useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser = currentUserQuery.data;

  const canReadUsers = hasPermission(
    currentUser,
    "users.read",
  );

  const canCreateUsers = hasPermission(
    currentUser,
    "users.create",
  );

  const canUpdateUsers = hasPermission(
    currentUser,
    "users.update",
  );

  const canDeactivateUsers = hasPermission(
    currentUser,
    "users.deactivate",
  );

  const canManageRoles = hasPermission(
    currentUser,
    "roles.manage",
  );

  const rolesQuery = useQuery({
    queryKey: userQueryKeys.roles,
    queryFn: getRoles,
    enabled:
      currentUserQuery.isSuccess &&
      hasPermission(currentUser, "roles.read"),
  });

  const usersQuery = useQuery({
    queryKey: userQueryKeys.list(
      search,
      page,
      PAGE_SIZE,
    ),
    queryFn: () =>
      getUsers({
        search,
        page,
        size: PAGE_SIZE,
      }),
    enabled:
      currentUserQuery.isSuccess && canReadUsers,
  });

  const totalPages =
    usersQuery.data?.page.totalPages ?? 0;

  const displayedPage =
    totalPages === 0
      ? 0
      : Math.min(page, totalPages - 1);

  useEffect(() => {
    if (
      currentUserQuery.error instanceof ApiError &&
      currentUserQuery.error.status === 401
    ) {
      router.replace("/login");
    }
  }, [currentUserQuery.error, router]);

  async function refreshUsers() {
    await queryClient.invalidateQueries({
      queryKey: userQueryKeys.lists(),
    });
  }

  const createUserMutation = useMutation({
    mutationFn: createUser,
  });

  const invitationMutation = useMutation({
    mutationFn: createInvitation,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({
      membershipId,
      values,
    }: {
      membershipId: string;
      values: UserFormValues;
    }) =>
      updateUser(membershipId, {
        firstName: values.firstName,
        lastName: values.lastName,
        roleIds: values.roleIds,
      }),
  });

  const suspendMutation = useMutation({
    mutationFn: suspendUser,
  });

  const reactivateMutation = useMutation({
    mutationFn: reactivateUser,
  });

  const formSubmitting =
    createUserMutation.isPending ||
    invitationMutation.isPending ||
    updateUserMutation.isPending;

  const dialogUser = useMemo(() => {
    if (dialog?.mode === "edit") {
      return dialog.user;
    }

    return undefined;
  }, [dialog]);

  function openCreateDialog() {
    setFormError(null);
    setDialog({ mode: "create" });
  }

  function openInvitationDialog() {
    setFormError(null);
    setDialog({ mode: "invite" });
  }

  function openEditDialog(user: OrganizationUser) {
    setFormError(null);
    setDialog({
      mode: "edit",
      user,
    });
  }

  function closeDialog() {
    if (formSubmitting) {
      return;
    }

    setFormError(null);
    setDialog(null);
  }

  async function handleFormSubmit(
    values: UserFormValues,
  ) {
    if (!dialog) {
      return;
    }

    setFormError(null);

    try {
      if (dialog.mode === "create") {
        await createUserMutation.mutateAsync({
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          temporaryPassword:
            values.temporaryPassword,
          roleIds: values.roleIds,
        });
      }

      if (dialog.mode === "invite") {
        const result =
          await invitationMutation.mutateAsync({
            email: values.email,
            firstName: values.firstName,
            lastName: values.lastName,
            roleIds: values.roleIds,
          });

        setInvitationResult(result);
      }

      if (dialog.mode === "edit") {
        await updateUserMutation.mutateAsync({
          membershipId:
            dialog.user.membershipId,
          values,
        });
      }

      await refreshUsers();
      setDialog(null);
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "The user could not be saved.",
        ),
      );
    }
  }

  async function handleSuspend(
    user: OrganizationUser,
  ) {
    const confirmed = window.confirm(
      `Suspend ${user.firstName} ${user.lastName}? Their active session will be invalidated.`,
    );

    if (!confirmed) {
      return;
    }

    setPageError(null);
    setStatusUpdatingMembershipId(
      user.membershipId,
    );

    try {
      await suspendMutation.mutateAsync(
        user.membershipId,
      );

      await refreshUsers();
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "The user could not be suspended.",
        ),
      );
    } finally {
      setStatusUpdatingMembershipId(null);
    }
  }

  async function handleReactivate(
    user: OrganizationUser,
  ) {
    setPageError(null);
    setStatusUpdatingMembershipId(
      user.membershipId,
    );

    try {
      await reactivateMutation.mutateAsync(
        user.membershipId,
      );

      await refreshUsers();
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "The user could not be reactivated.",
        ),
      );
    } finally {
      setStatusUpdatingMembershipId(null);
    }
  }

  function handleSearchSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(0);
  }

  if (currentUserQuery.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">
          Loading user session...
        </p>
      </main>
    );
  }

  if (currentUserQuery.isError || !currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-lg bg-red-50 p-5 text-red-700">
          Your session could not be loaded.
        </div>
      </main>
    );
  }

  if (!canReadUsers) {
    return (
      <div className="min-h-screen bg-slate-100">
        <DashboardHeader user={currentUser} />

        <main className="mx-auto max-w-7xl p-6">
          <div className="rounded-xl bg-red-50 p-5 text-red-700">
            You do not have permission to access user
            management.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader user={currentUser} />

      <main className="mx-auto max-w-7xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Organization users
            </h1>

            <p className="mt-1 text-slate-600">
              Manage administrators, instructors, coaches,
              teachers, and guardians.
            </p>
          </div>

          {canCreateUsers && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openInvitationDialog}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Invite user
              </button>

              <button
                type="button"
                onClick={openCreateDialog}
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
              >
                Create active user
              </button>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="mt-6 flex max-w-xl gap-2"
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
            placeholder="Search by name or email"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2"
          />

          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50"
          >
            Search
          </button>

          {(search || searchInput) && (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </form>

        {pageError && (
          <div
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-4 text-red-700"
          >
            {pageError}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          {usersQuery.isPending && (
            <div className="p-10 text-center text-slate-500">
              Loading users...
            </div>
          )}

          {usersQuery.isError && (
            <div className="p-10 text-center text-red-600">
              {getApiErrorMessage(
                usersQuery.error,
                "Users could not be loaded.",
              )}
            </div>
          )}

          {usersQuery.data && (
            <UserTable
              users={usersQuery.data.data}
              currentMembershipId={
                currentUser.membershipId
              }
              canUpdate={
                canUpdateUsers && canManageRoles
              }
              canDeactivate={canDeactivateUsers}
              statusUpdatingMembershipId={
                statusUpdatingMembershipId
              }
              onEdit={openEditDialog}
              onSuspend={handleSuspend}
              onReactivate={handleReactivate}
            />
          )}
        </section>

        {usersQuery.data && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              {usersQuery.data.page.totalElements} users
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={page === 0}
                onClick={() =>
                  setPage((value) =>
                    Math.max(value - 1, 0),
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <span className="text-sm text-slate-600">
                Page {displayedPage + 1} of{" "}
                {Math.max(totalPages, 1)}
              </span>

              <button
                type="button"
                disabled={
                  page + 1 >=
                  usersQuery.data.page.totalPages
                }
                onClick={() =>
                  setPage((value) => value + 1)
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {dialog && rolesQuery.data && (
        <UserFormDialog
          mode={dialog.mode}
          roles={rolesQuery.data}
          user={dialogUser}
          submitting={formSubmitting}
          errorMessage={formError}
          onClose={closeDialog}
          onSubmit={handleFormSubmit}
        />
      )}

      {invitationResult && (
        <InvitationResultDialog
          invitation={invitationResult}
          onClose={() =>
            setInvitationResult(null)
          }
        />
      )}
    </div>
  );
}
