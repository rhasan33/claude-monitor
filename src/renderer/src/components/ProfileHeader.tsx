import type { Profile } from '../../../shared/types'

export function ProfileHeader({ profile }: { profile: Profile | null }) {
  return (
    <div className="profile-header">
      <h1>Claude Monitor</h1>
      {profile?.email && (
        <div className="profile-meta">
          <span>{profile.email}</span>
          {profile.orgName && <span> · {profile.orgName}</span>}
          {profile.seatTier && <span> · {profile.seatTier}</span>}
        </div>
      )}
    </div>
  )
}
