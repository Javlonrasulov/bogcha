import type { Metadata } from 'next';
import { getViewer } from '../../../lib/auth';
import { getT } from '../../../i18n/server';
import { Badge } from '../../../components/ui/badge';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { Avatar, MiniStat } from '../../../components/ui/misc';
import { PageHeader } from '../../../components/ui/page-header';
import { ChangePasswordForm } from './change-password';

export const metadata: Metadata = { title: 'Profil' };

export default async function ProfilePage() {
  const [viewer, t] = await Promise.all([getViewer(), getT()]);
  const { user } = viewer;

  const branchNames =
    user.branchIds.length === 0
      ? t.common.allBranches
      : viewer.branches
          .filter((branch) => user.branchIds.includes(branch.id))
          .map((branch) => branch.name)
          .join(', ');

  return (
    <>
      <PageHeader title={t.profile.title} subtitle={t.profile.subtitle} />

      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          <Avatar name={user.fullName} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-content">{user.fullName}</h2>
            <p className="tabular text-sm text-content-muted">
              {user.phone}
              {user.email ? ` · ${user.email}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.roles.map((role) => (
                <Badge key={role} tone="brand">
                  {t.roles[role]}
                </Badge>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label={t.profile.myBranches} value={branchNames || '—'} />
        <MiniStat
          label={t.users.permissions}
          value={String(user.permissions.length)}
          hint={t.users.roles}
        />
        <MiniStat label={t.profile.myGroups} value={String(user.groupIds.length || '—')} />
      </div>

      <Card>
        <CardHeader title={t.profile.security} subtitle={t.profile.changePassword} />
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t.users.permissions} subtitle={t.auth.profile} />
        <CardBody>
          <div className="flex flex-wrap gap-1.5">
            {user.permissions.map((permission) => (
              <span
                key={permission}
                className="rounded-md bg-surface-muted px-2 py-1 text-[0.7rem] font-medium text-content-secondary"
              >
                {permission}
              </span>
            ))}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
