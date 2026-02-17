import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import MembersSection from '@/components/settings/members-section'
import type { TeamMember, TeamInvitation } from '@/types/navigation'

// Mock actions
vi.mock('@/lib/actions/members', () => ({
  updateMemberRoleAction: vi.fn().mockResolvedValue({ success: true }),
  removeMemberAction: vi.fn().mockResolvedValue({ success: true }),
  cancelInvitationAction: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock InviteMemberDialog component
vi.mock('@/components/settings/invite-member-dialog', () => ({
  default: vi.fn(({ open }: { open: boolean; onOpenChange: (open: boolean) => void }) =>
    open ? <div data-testid="invite-dialog">Invite Dialog</div> : null
  ),
}))

describe('MembersSection', () => {
  const mockMembers: TeamMember[] = [
    {
      id: 'user-1',
      fullName: 'Alice Owner',
      email: 'alice@example.com',
      avatarUrl: null,
      role: 'owner',
      joinedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-2',
      fullName: 'Bob Admin',
      email: 'bob@example.com',
      avatarUrl: null,
      role: 'admin',
      joinedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 'user-3',
      fullName: 'Charlie Member',
      email: 'charlie@example.com',
      avatarUrl: null,
      role: 'member',
      joinedAt: '2024-01-03T00:00:00Z',
    },
  ]

  const mockInvitations: TeamInvitation[] = [
    {
      id: 'inv-1',
      email: 'dave@example.com',
      role: 'member',
      invitedBy: 'user-1',
      status: 'pending',
      expiresAt: '2099-01-01T00:00:00Z',
      createdAt: '2024-01-04T00:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('T011: Renders members list, shows avatars, role badges, empty state', () => {
    it('renders members list with avatars and role badges', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      expect(screen.getByRole('heading', { name: 'Members' })).toBeInTheDocument()
      expect(screen.getByText('Manage who has access to this workspace')).toBeInTheDocument()

      // Check all members are rendered
      expect(screen.getByText('Alice Owner')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('Bob Admin')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
      expect(screen.getByText('Charlie Member')).toBeInTheDocument()
      expect(screen.getByText('charlie@example.com')).toBeInTheDocument()
    })

    it('shows avatar initials for members without avatarUrl', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      expect(screen.getByText('AO')).toBeInTheDocument()
      expect(screen.getByText('BA')).toBeInTheDocument()
      expect(screen.getByText('CM')).toBeInTheDocument()
    })

    it('shows role badges for all members', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      expect(screen.getByText('Owner')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Member')).toBeInTheDocument()
    })

    it('shows empty state when no members', () => {
      render(
        <MembersSection
          members={[]}
          invitations={[]}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      expect(
        screen.getByText('No team members yet. Invite someone to get started.')
      ).toBeInTheDocument()
    })

    it('marks current user with (you) label', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      expect(screen.getByText('(you)')).toBeInTheDocument()
    })

    it('shows invite button for owners', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      expect(screen.getByRole('button', { name: 'Invite member' })).toBeInTheDocument()
    })

    it('shows invite button for admins', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="admin"
          currentUserId="user-2"
        />
      )

      expect(screen.getByRole('button', { name: 'Invite member' })).toBeInTheDocument()
    })

    it('does not show invite button for regular members', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="member"
          currentUserId="user-3"
        />
      )

      expect(screen.queryByRole('button', { name: 'Invite member' })).not.toBeInTheDocument()
    })
  })

  describe('T025: Role dropdown visible for owner, hidden for non-owner, disabled for self', () => {
    it('shows role dropdown for owner on non-owner members', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      // Owner viewing admin - should see dropdown trigger button with chevron
      const adminSection = screen.getByText('Bob Admin').closest('div')
      expect(adminSection).toBeInTheDocument()

      // The dropdown has a ChevronDown icon, find button with badge
      const buttons = screen.getAllByRole('button')
      const roleDropdownButton = buttons.find(
        (btn) => btn.textContent?.includes('Admin') && btn.querySelector('svg')
      )
      expect(roleDropdownButton).toBeInTheDocument()
    })

    it('does not show role dropdown for owner on owner role', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      // Owner viewing their own row - should see badge only, no dropdown
      const ownerSection = screen.getByText('Alice Owner').closest('div')
      expect(ownerSection).toBeInTheDocument()

      // Should have Owner badge but not in a dropdown button
      expect(screen.getByText('Owner')).toBeInTheDocument()

      // Find all buttons that contain "Owner" text - there shouldn't be any
      const buttons = screen.getAllByRole('button')
      const ownerDropdownButton = buttons.find(
        (btn) => btn.textContent?.includes('Owner') && btn.querySelector('svg')
      )
      expect(ownerDropdownButton).toBeUndefined()
    })

    it('does not show role dropdown for admin users', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="admin"
          currentUserId="user-2"
        />
      )

      // Admin cannot change roles - should see badges only
      expect(screen.getByText('Owner')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Member')).toBeInTheDocument()

      // No dropdown buttons with chevrons
      const buttons = screen.getAllByRole('button')
      const roleDropdownButtons = buttons.filter(
        (btn) =>
          (btn.textContent?.includes('Admin') || btn.textContent?.includes('Member')) &&
          btn.querySelector('svg')
      )
      // Should only have remove buttons, not role dropdowns
      expect(roleDropdownButtons.length).toBe(0)
    })

    it('does not show role dropdown for regular members', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="member"
          currentUserId="user-3"
        />
      )

      // Member cannot change roles - should see badges only, no dropdown buttons
      expect(screen.getByText('Owner')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Member')).toBeInTheDocument()

      // Member has no manage permissions, so no buttons should appear (no invite, no remove, no role dropdowns)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('owner can open role dropdown and change role', async () => {
      const user = userEvent.setup()
      const { updateMemberRoleAction } = await import('@/lib/actions/members')

      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      // Find and click the Admin role dropdown
      const buttons = screen.getAllByRole('button')
      const adminDropdownButton = buttons.find(
        (btn) => btn.textContent?.includes('Admin') && btn.querySelector('svg')
      )
      expect(adminDropdownButton).toBeDefined()

      if (adminDropdownButton) {
        await user.click(adminDropdownButton)

        // Wait for dropdown menu to appear
        await waitFor(() => {
          expect(screen.getByRole('menuitem', { name: 'Member' })).toBeInTheDocument()
        })

        // Click to change role to Member
        await user.click(screen.getByRole('menuitem', { name: 'Member' }))

        // Verify action was called
        await waitFor(() => {
          expect(updateMemberRoleAction).toHaveBeenCalled()
        })
      }
    })
  })

  describe('T029: Remove button visibility rules', () => {
    it('does not show remove button for owner role', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      // Owner row should not have remove button (can't remove self as owner)
      const ownerSection = screen.getByText('Alice Owner').closest('div')
      expect(ownerSection).toBeInTheDocument()

      // Remove buttons are icon buttons with X icon and text-muted-foreground class
      const allButtons = screen.getAllByRole('button')
      const removeButtons = allButtons.filter((btn) => {
        // The remove button has text-muted-foreground in className
        return btn.className.includes('text-muted-foreground') && btn.className.includes('h-7')
      })

      // Should have remove buttons for admin and member, but not owner (self)
      // Owner (user-1) can remove user-2 (admin) and user-3 (member), total 2
      expect(removeButtons.length).toBe(2)
    })

    it('owner can remove admin and member', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      const allButtons = screen.getAllByRole('button')
      const removeButtons = allButtons.filter((btn) => {
        return btn.className.includes('text-muted-foreground') && btn.className.includes('h-7')
      })

      // Owner can remove both admin and member (not self)
      expect(removeButtons.length).toBe(2)
    })

    it('admin can remove member but not admin or owner', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="admin"
          currentUserId="user-2"
        />
      )

      const allButtons = screen.getAllByRole('button')
      const removeButtons = allButtons.filter((btn) => {
        return btn.className.includes('text-muted-foreground') && btn.className.includes('h-7')
      })

      // Admin can only remove member (not owner, not other admin, not self)
      expect(removeButtons.length).toBe(1)
    })

    it('member cannot remove anyone', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="member"
          currentUserId="user-3"
        />
      )

      // Member has no permissions, so no buttons at all
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('cannot remove self', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="admin"
          currentUserId="user-2"
        />
      )

      // Bob Admin viewing - should not have remove button on their own row
      const bobSection = screen.getByText('Bob Admin').closest('div')?.closest('div')
      expect(bobSection).toBeInTheDocument()

      const allButtons = screen.getAllByRole('button')
      const removeButtons = allButtons.filter((btn) => {
        return btn.className.includes('text-muted-foreground') && btn.className.includes('h-7')
      })

      // Only 1 remove button (for Charlie Member), not for self or owner
      expect(removeButtons.length).toBe(1)
    })

    it('shows remove confirmation dialog', async () => {
      const user = userEvent.setup()

      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      // Find first remove button
      const allButtons = screen.getAllByRole('button')
      const removeButtons = allButtons.filter((btn) => {
        return btn.className.includes('text-muted-foreground') && btn.className.includes('h-7')
      })

      expect(removeButtons.length).toBeGreaterThan(0)
      await user.click(removeButtons[0])

      // Wait for alert dialog
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      expect(screen.getByText('Remove member')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to remove/)).toBeInTheDocument()
    })

    it('removes member when confirmed', async () => {
      const user = userEvent.setup()
      const { removeMemberAction } = await import('@/lib/actions/members')

      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      // Click remove button
      const allButtons = screen.getAllByRole('button')
      const removeButtons = allButtons.filter((btn) => {
        return btn.className.includes('text-muted-foreground') && btn.className.includes('h-7')
      })

      await user.click(removeButtons[0])

      // Wait for and click confirm
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      const removeButton = screen.getByRole('button', { name: 'Remove' })
      await user.click(removeButton)

      // Verify action was called
      await waitFor(() => {
        expect(removeMemberAction).toHaveBeenCalled()
      })
    })
  })

  describe('Pending invitations', () => {
    it('shows pending invitations section for owners', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={mockInvitations}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      expect(screen.getByText('Pending invitations')).toBeInTheDocument()
      expect(screen.getByText('dave@example.com')).toBeInTheDocument()
      expect(screen.getByText('Invited as member')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('shows pending invitations section for admins', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={mockInvitations}
          currentUserRole="admin"
          currentUserId="user-2"
        />
      )

      expect(screen.getByText('Pending invitations')).toBeInTheDocument()
    })

    it('does not show pending invitations for regular members', () => {
      render(
        <MembersSection
          members={mockMembers}
          invitations={mockInvitations}
          currentUserRole="member"
          currentUserId="user-3"
        />
      )

      expect(screen.queryByText('Pending invitations')).not.toBeInTheDocument()
    })

    it('allows cancelling invitations', async () => {
      const user = userEvent.setup()
      const { cancelInvitationAction } = await import('@/lib/actions/members')

      render(
        <MembersSection
          members={mockMembers}
          invitations={mockInvitations}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      // Find cancel button in invitations section
      const invitationSection = screen.getByText('dave@example.com').closest('div')
      expect(invitationSection).toBeInTheDocument()

      const buttons = screen.getAllByRole('button')
      const cancelButton = buttons.find((btn) => {
        const svg = btn.querySelector('svg')
        return svg && btn.className.includes('ghost') && btn.className.includes('w-7')
      })

      if (cancelButton) {
        await user.click(cancelButton)

        await waitFor(() => {
          expect(cancelInvitationAction).toHaveBeenCalledWith('inv-1')
        })
      }
    })
  })

  describe('Invite member dialog integration', () => {
    it('opens invite dialog when invite button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <MembersSection
          members={mockMembers}
          invitations={[]}
          currentUserRole="owner"
          currentUserId="user-1"
        />
      )

      const inviteButton = screen.getByRole('button', { name: 'Invite member' })
      await user.click(inviteButton)

      await waitFor(() => {
        expect(screen.getByTestId('invite-dialog')).toBeInTheDocument()
      })
    })
  })
})
