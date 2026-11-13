"use client";

import type { usePassengerDirectory } from "../usePassengerDirectory";
import type { usePassengerProfile } from "../usePassengerProfile";
import { JoinBusModal } from "./JoinBusModal";
import { OnboardingModal, type OnboardingSubmission } from "./OnboardingModal";
import { PassengerCard } from "./PassengerCard";
import { PassengerListModal } from "./PassengerListModal";

/** Présentation des fenêtres ; les hooks possèdent les requêtes et leurs annulations. */
export function PassengerDialogs({ profile, directory, count, currentSeatIndex, onSubmitOnboarding }: {
  profile: ReturnType<typeof usePassengerProfile>;
  directory: ReturnType<typeof usePassengerDirectory>;
  count: number | null;
  currentSeatIndex: number | null;
  onSubmitOnboarding: (submission: OnboardingSubmission) => void;
}) {
  return <>
    {profile.onboardingReason && (
      <OnboardingModal
        key={profile.onboardingInstanceKey}
        reason={profile.onboardingReason}
        seatIndex={currentSeatIndex}
        initialName={profile.onboardingSeed.displayName}
        initialComment={profile.onboardingSeed.comment}
        initialAvatarId={profile.onboardingSeed.avatarId}
        hasLockedDbAvatar={profile.onboardingSeed.hasLockedDbAvatar}
        saving={profile.profileSaving}
        error={profile.onboardingError}
        onClearError={profile.clearOnboardingError}
        onSubmit={onSubmitOnboarding}
      />
    )}
    <JoinBusModal
      isOpen={profile.showJoinModal} mode={profile.profileModalMode}
      name={profile.joinName} comment={profile.joinComment} error={profile.joinError} joining={profile.profileSaving}
      hasSavedValue={Boolean(profile.profileModalMode === "name" ? profile.savedProfile.name : profile.savedProfile.comment)}
      onNameChange={profile.changeName} onCommentChange={profile.changeComment} onClose={profile.closeProfile}
      onSubmit={() => void profile.submitProfile()} onRemove={() => void profile.removeProfileField()}
    />
    <PassengerCard
      passenger={directory.selectedPassenger} loading={directory.passengerCardLoading} error={directory.passengerCardError}
      returnFocusRef={directory.passengerManifestButtonRef}
      onRetry={() => directory.selectedPassenger && void directory.openPassengerCard(directory.selectedPassenger)}
      onBack={directory.passengerOpenedFromList ? directory.backToManifest : undefined}
      onClose={directory.closePassengerCard}
    />
    <PassengerListModal
      isOpen={directory.showPassengerList} count={count} passengers={directory.passengerManifest}
      loading={directory.manifestLoading} error={directory.manifestError} hasMore={directory.manifestHasMore}
      returnFocusRef={directory.passengerManifestButtonRef}
      onLoadMore={() => void directory.loadPassengerManifest(directory.manifestNextFrom)}
      onRetry={() => void directory.loadPassengerManifest(directory.passengerManifest.length === 0 ? 0 : directory.manifestNextFrom)}
      onPassengerClick={directory.selectFromManifest} onClose={directory.closePassengerManifest}
    />
  </>;
}
