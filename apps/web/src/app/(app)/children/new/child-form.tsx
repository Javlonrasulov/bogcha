'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ChildStatus, Gender, Permission } from '@bogcha/shared';
import { createChildAction } from '../../../actions/children';
import { useAppData, useViewer } from '../../../../lib/app-data';
import { useT } from '../../../../i18n/client';
import { cn, todayIso } from '../../../../lib/utils';
import { inputClass } from '../../../../components/ui/filters';
import { Button, ButtonLink } from '../../../../components/ui/button';
import { Card, CardBody, CardHeader } from '../../../../components/ui/card';
import { PageHeader } from '../../../../components/ui/page-header';

export function ChildForm() {
  const t = useT();
  const router = useRouter();
  const viewer = useViewer();
  const { data, refresh } = useAppData();
  const [pending, startTransition] = useTransition();

  const defaultBranchId = viewer.branchId ?? viewer.branches[0]?.id ?? '';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [groupId, setGroupId] = useState('');
  const [enrolledAt, setEnrolledAt] = useState(todayIso());
  const [monthlyFee, setMonthlyFee] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [discountReason, setDiscountReason] = useState('');
  const [address, setAddress] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [note, setNote] = useState('');

  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('+998');
  const [guardianWorkplace, setGuardianWorkplace] = useState('');

  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const branchGroups = useMemo(
    () => data.groups.filter((group) => !branchId || group.branchId === branchId),
    [data.groups, branchId],
  );

  if (!viewer.can(Permission.CHILD_MANAGE)) {
    return (
      <Card>
        <CardBody className="py-10 text-center text-sm text-content-secondary">
          {t.common.error}
          <div className="mt-4">
            <ButtonLink href="/children" variant="secondary" size="md">
              {t.common.back}
            </ButtonLink>
          </div>
        </CardBody>
      </Card>
    );
  }

  const valid =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    Boolean(birthDate) &&
    Boolean(branchId) &&
    Boolean(enrolledAt) &&
    Number(monthlyFee) >= 0 &&
    monthlyFee !== '' &&
    guardianName.trim().length >= 3 &&
    guardianRelation.trim().length >= 2 &&
    guardianPhone.trim().length >= 12;

  const submit = () => {
    if (!valid) {
      setMessage({ ok: false, text: t.common.error });
      return;
    }

    startTransition(async () => {
      const result = await createChildAction({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(middleName.trim() ? { middleName: middleName.trim() } : {}),
        birthDate,
        gender,
        branchId,
        ...(groupId ? { groupId } : {}),
        enrolledAt,
        status: ChildStatus.ACTIVE,
        monthlyFee: Number(monthlyFee),
        discountPercent: Number(discountPercent) || 0,
        discountAmount: Number(discountAmount) || 0,
        ...(discountReason.trim() ? { discountReason: discountReason.trim() } : {}),
        guardians: [
          {
            fullName: guardianName.trim(),
            relation: guardianRelation.trim(),
            phone: guardianPhone.trim(),
            isPrimary: true,
            ...(guardianWorkplace.trim() ? { workplace: guardianWorkplace.trim() } : {}),
          },
        ],
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(medicalNotes.trim() ? { medicalNotes: medicalNotes.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });

      if (result.ok && result.id) {
        await refresh();
        router.push(`/children/${result.id}`);
        router.refresh();
        return;
      }

      setMessage({ ok: false, text: result.error ?? t.common.error });
    });
  };

  return (
    <>
      <Link
        href="/children"
        className="inline-flex items-center gap-1.5 text-sm text-content-muted transition-colors hover:text-content"
      >
        <ArrowLeft className="size-4" />
        {t.children.title}
      </Link>

      <PageHeader title={t.children.addChild} subtitle={t.children.subtitle} />

      <div className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader title={t.children.profile} />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Field label={t.children.lastName}>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className={inputClass}
                autoComplete="off"
              />
            </Field>
            <Field label={t.children.firstName}>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className={inputClass}
                autoComplete="off"
              />
            </Field>
            <Field label={t.children.middleName}>
              <input
                value={middleName}
                onChange={(event) => setMiddleName(event.target.value)}
                className={inputClass}
                autoComplete="off"
              />
            </Field>
            <Field label={t.children.birthDate}>
              <input
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label={t.children.gender}>
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value as Gender)}
                className={inputClass}
              >
                <option value={Gender.MALE}>{t.children.male}</option>
                <option value={Gender.FEMALE}>{t.children.female}</option>
              </select>
            </Field>
            <Field label={t.children.enrolledAt}>
              <input
                type="date"
                value={enrolledAt}
                onChange={(event) => setEnrolledAt(event.target.value)}
                className={inputClass}
              />
            </Field>
            {viewer.branches.length > 1 ? (
              <Field label={t.common.branch}>
                <select
                  value={branchId}
                  onChange={(event) => {
                    setBranchId(event.target.value);
                    setGroupId('');
                  }}
                  className={inputClass}
                >
                  {viewer.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label={t.common.group}>
              <select
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                className={inputClass}
              >
                <option value="">{t.children.noGroup}</option>
                {branchGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.children.monthlyFee}>
              <input
                type="number"
                min={0}
                value={monthlyFee}
                onChange={(event) => setMonthlyFee(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label={`${t.children.discount} %`}>
              <input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(event) => setDiscountPercent(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label={`${t.children.discount} (${t.common.amount})`}>
              <input
                type="number"
                min={0}
                value={discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label={t.common.reason}>
              <input
                value={discountReason}
                onChange={(event) => setDiscountReason(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label={t.common.address} className="sm:col-span-2">
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label={t.children.medicalNotes} className="sm:col-span-2">
              <textarea
                value={medicalNotes}
                onChange={(event) => setMedicalNotes(event.target.value)}
                className={cn(inputClass, 'h-24 resize-y py-2')}
              />
            </Field>
            <Field label={t.common.note} className="sm:col-span-2">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className={cn(inputClass, 'h-20 resize-y py-2')}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t.children.guardians} subtitle={t.children.primaryGuardian} />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Field label={t.common.fullName} className="sm:col-span-2">
              <input
                value={guardianName}
                onChange={(event) => setGuardianName(event.target.value)}
                className={inputClass}
                autoComplete="off"
              />
            </Field>
            <Field label={t.children.relation}>
              <input
                value={guardianRelation}
                onChange={(event) => setGuardianRelation(event.target.value)}
                className={inputClass}
                placeholder="Ona / Ota"
                autoComplete="off"
              />
            </Field>
            <Field label={t.common.phone}>
              <input
                value={guardianPhone}
                onChange={(event) => setGuardianPhone(event.target.value)}
                className={inputClass}
                autoComplete="off"
              />
            </Field>
            <Field label={t.children.workplace} className="sm:col-span-2">
              <input
                value={guardianWorkplace}
                onChange={(event) => setGuardianWorkplace(event.target.value)}
                className={inputClass}
                autoComplete="off"
              />
            </Field>
          </CardBody>
        </Card>
      </div>

      {message ? (
        <p className={cn('text-sm', message.ok ? 'text-success' : 'text-danger')}>{message.text}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="md" disabled={!valid || pending} onClick={submit}>
          {pending ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : null}
          {pending ? t.common.saving : t.common.save}
        </Button>
        <ButtonLink href="/children" variant="ghost" size="md">
          {t.common.cancel}
        </ButtonLink>
      </div>
    </>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-xs font-medium text-content-secondary">{label}</span>
      {children}
    </label>
  );
}
