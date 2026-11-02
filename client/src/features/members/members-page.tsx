import { useEffect, useState } from 'react';
import { AnimatedIcon } from '../../components/ui/animated-icon';
import {
  Avatar,
  Button,
  DrawerSheet,
  EmptyState,
  ErrorState,
  Masthead,
  Section,
  SkeletonRows,
  Tag,
  dateEyebrow,
} from '../../components/ui/primitives';
import { toast } from '../../components/feedback/toast-store';
import { applyServerErrorsToForm, type MemberDTO } from '../../lib/api';
import {
  useCreateMemberMutation,
  useDeleteMemberMutation,
  useMembersQuery,
  useUpdateMemberMutation,
} from './hooks';

export function MembersPage() {
  const membersQuery = useMembersQuery();
  const createMutation = useCreateMemberMutation();
  const updateMutation = useUpdateMemberMutation();
  const deleteMutation = useDeleteMemberMutation();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberDTO | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [avatarHue, setAvatarHue] = useState('176');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!sheetOpen) return;
    setErrors({});
    if (editingMember) {
      setName(editingMember.name);
      setEmail(editingMember.email);
      setRole(editingMember.role);
      setAvatarHue(String(editingMember.avatarHue));
    } else {
      setName('');
      setEmail('');
      setRole('');
      setAvatarHue('176');
    }
  }, [sheetOpen, editingMember]);

  const handleOpenCreate = () => {
    setEditingMember(null);
    setSheetOpen(true);
  };

  const handleOpenEdit = (m: MemberDTO) => {
    setEditingMember(m);
    setSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) {
      nextErrors.name = 'Enter a name of at least 2 characters.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        role: role.trim() || 'Team member',
        avatarHue: Math.min(359, Math.max(0, Number(avatarHue) || 176)),
      };
      if (editingMember) {
        await updateMutation.mutateAsync({
          id: editingMember.id,
          input: payload,
        });
        toast({ title: 'Member updated', body: payload.name, tone: 'ok' });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: 'Member added', body: payload.name, tone: 'ok' });
      }
      setSheetOpen(false);
    } catch (err) {
      const serverErrors: Record<string, string> = {};
      const mapped = applyServerErrorsToForm(err, (field, fErr) => {
        serverErrors[field] = fErr.message ?? 'Invalid value';
      });
      if (mapped) {
        setErrors(serverErrors);
      } else {
        toast({
          title: 'Could not save member',
          body: err instanceof Error ? err.message : 'Unexpected error',
          tone: 'err',
        });
      }
    }
  };

  const handleDelete = async (m: MemberDTO) => {
    try {
      await deleteMutation.mutateAsync(m.id);
      toast({ title: 'Member removed', body: m.name, tone: 'info' });
    } catch (err) {
      toast({
        title: 'Cannot remove member',
        body:
          err instanceof Error
            ? err.message
            : 'Member still owns active records.',
        tone: 'err',
      });
    }
  };

  const members = membersQuery.data ?? [];

  return (
    <div>
      <Masthead
        eyebrow={dateEyebrow()}
        title={
          <>
            Team <em>members</em>
          </>
        }
        dek="People who attend meetings, make decisions, and own action items."
        side={
          <Button variant="primary" icon="plus" onClick={handleOpenCreate}>
            Add member
          </Button>
        }
      />

      <Section index={0} title="Directory" count={members.length}>
        {membersQuery.isLoading ? (
          <SkeletonRows count={4} />
        ) : membersQuery.isError ? (
          <ErrorState
            message={
              membersQuery.error instanceof Error
                ? membersQuery.error.message
                : 'Could not load team members.'
            }
            onRetry={() => void membersQuery.refetch()}
          />
        ) : members.length > 0 ? (
          members.map((m) => (
            <div
              key={m.id}
              className="drow ah"
              style={{ alignItems: 'center' }}
              data-member={m.id}
            >
              <Avatar member={m} size="lg" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '16px' }}>{m.name}</div>
                <div className="ameta">
                  <Tag>{m.role || 'Team member'}</Tag>
                  <span className="mono" style={{ fontSize: '12px' }}>
                    {m.email}
                  </span>
                </div>
              </div>
              <div className="dact">
                <div className="row">
                  <Button
                    variant="line"
                    size="sm"
                    onClick={() => handleOpenEdit(m)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon="trash"
                    aria-label={`Remove ${m.name}`}
                    onClick={() => void handleDelete(m)}
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="No members yet"
            description="Add team members so meetings and tasks can be assigned."
          />
        )}
      </Section>

      <DrawerSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        eyebrow={editingMember ? 'Edit member' : 'New member'}
        title={editingMember ? 'Update team member' : 'Add team member'}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="memberForm"
              icon="check"
            >
              {editingMember ? 'Save changes' : 'Add member'}
            </Button>
          </>
        }
      >
        <form
          id="memberForm"
          onSubmit={handleSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
        >
          <div className={`field ${errors.name ? 'err' : ''}`}>
            <label htmlFor="memName">Full name</label>
            <input
              className="input"
              id="memName"
              value={name}
              placeholder="e.g. Ananya Rao"
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: '' }));
              }}
            />
            <p className="ferr">
              {errors.name && (
                <>
                  <AnimatedIcon name="alert" />
                  {errors.name}
                </>
              )}
            </p>
          </div>

          <div className={`field ${errors.email ? 'err' : ''}`}>
            <label htmlFor="memEmail">Email</label>
            <input
              className="input"
              id="memEmail"
              type="email"
              value={email}
              placeholder="ananya@team.dev"
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: '' }));
              }}
            />
            <p className="ferr">
              {errors.email && (
                <>
                  <AnimatedIcon name="alert" />
                  {errors.email}
                </>
              )}
            </p>
          </div>

          <div className="field">
            <label htmlFor="memRole">Role</label>
            <input
              className="input"
              id="memRole"
              value={role}
              placeholder="e.g. Product lead"
              onChange={(e) => setRole(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="memHue">Avatar hue (0–359)</label>
            <input
              className="input"
              id="memHue"
              type="number"
              min={0}
              max={359}
              value={avatarHue}
              onChange={(e) => setAvatarHue(e.target.value)}
            />
          </div>
        </form>
      </DrawerSheet>
    </div>
  );
}
