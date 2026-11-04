import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { resolveAvatarUrl } from '../utils/format';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_EXTS = ['.png', '.jpg', '.jpeg', '.webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [description, setDescription] = useState(user?.description ?? '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? '');
      setDescription(user.description ?? '');
    }
  }, [user]);

  if (!user) {
    return null;
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    if (displayName.length > 100) {
      setProfileError('Display name cannot exceed 100 characters');
      return;
    }
    if (description.length > 2000) {
      setProfileError('Description cannot exceed 2000 characters');
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await userService.updateMyProfile({
        displayName: displayName.trim(),
        description: description.trim(),
      });
      if (updateUser) {
        updateUser(updated);
      }
      setProfileSuccess('Profile updated successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setProfileError(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    setAvatarSuccess(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setAvatarPreview(null);
      return;
    }

    const extMatch = ALLOWED_EXTS.some((ext) => file.name.toLowerCase().endsWith(ext));
    const typeMatch = ALLOWED_TYPES.includes(file.type.toLowerCase());
    if (!extMatch && !typeMatch) {
      setAvatarError('Invalid image format. Allowed formats: PNG, JPG, WEBP');
      e.target.value = '';
      setSelectedFile(null);
      setAvatarPreview(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setAvatarError('Avatar size must not exceed 2MB');
      e.target.value = '';
      setSelectedFile(null);
      setAvatarPreview(null);
      return;
    }

    setSelectedFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setAvatarError('Please select an image file first');
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(null);

    try {
      const updated = await userService.uploadAvatar(selectedFile);
      if (updateUser) {
        updateUser(updated);
      }
      setAvatarSuccess('Avatar updated successfully');
      setSelectedFile(null);
      setAvatarPreview(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload avatar';
      setAvatarError(msg);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const currentAvatarUrl = avatarPreview || resolveAvatarUrl(user.avatarUrl);
  const initial = user.username.charAt(0).toUpperCase();

  return (
    <div className="container py-4" style={{ maxWidth: '720px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <div>
          <h1 className="h3 mb-1">Your Profile</h1>
          <p className="text-secondary mb-0">Manage your profile details and avatar</p>
        </div>
        <Link to={`/users/${encodeURIComponent(user.username)}`} className="btn btn-outline-primary btn-sm">
          View Public Profile
        </Link>
      </div>

      {/* Account Info (Read-only) */}
      <section className="card mb-4 shadow-sm" aria-label="Account details">
        <div className="card-body">
          <h2 className="card-title h5 mb-3">Account Information</h2>
          <div className="row g-3">
            <div className="col-sm-6">
              <label className="form-label text-secondary small mb-1">Username</label>
              <input type="text" className="form-control" value={user.username} disabled readOnly />
            </div>
            <div className="col-sm-6">
              <label className="form-label text-secondary small mb-1">Email</label>
              <input type="email" className="form-control" value={user.email} disabled readOnly />
            </div>
          </div>
        </div>
      </section>

      {/* Avatar Upload */}
      <section className="card mb-4 shadow-sm" aria-label="Avatar settings">
        <div className="card-body">
          <h2 className="card-title h5 mb-3">Avatar</h2>

          {avatarSuccess && (
            <div className="alert alert-success py-2" role="alert">
              {avatarSuccess}
            </div>
          )}
          {avatarError && (
            <div className="alert alert-danger py-2" role="alert">
              {avatarError}
            </div>
          )}

          <div className="d-flex align-items-center gap-3 mb-3">
            {currentAvatarUrl ? (
              <img
                src={currentAvatarUrl}
                alt={user.username}
                className="rounded-circle border"
                style={{ width: '80px', height: '80px', objectFit: 'cover' }}
              />
            ) : (
              <span
                className="rounded-circle bg-primary text-white d-inline-flex justify-content-center align-items-center fs-2 fw-bold"
                style={{ width: '80px', height: '80px' }}
              >
                {initial}
              </span>
            )}
            <div className="text-secondary small">Upload a PNG, JPG or WEBP image up to 2MB.</div>
          </div>

          <form onSubmit={handleAvatarUpload} className="d-flex flex-column flex-sm-row gap-2">
            <input
              type="file"
              className="form-control"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              aria-label="Choose avatar image"
            />
            <button
              type="submit"
              className="btn btn-outline-primary text-nowrap"
              disabled={!selectedFile || isUploadingAvatar}
            >
              {isUploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
            </button>
          </form>
        </div>
      </section>

      {/* Edit Profile Form */}
      <section className="card shadow-sm" aria-label="Profile details">
        <div className="card-body">
          <h2 className="card-title h5 mb-3">Profile Details</h2>

          {profileSuccess && (
            <div className="alert alert-success py-2" role="alert">
              {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="alert alert-danger py-2" role="alert">
              {profileError}
            </div>
          )}

          <form onSubmit={handleProfileSubmit}>
            <div className="mb-3">
              <label htmlFor="displayName" className="form-label">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                className="form-control"
                value={displayName}
                maxLength={100}
                placeholder="How your name appears to others"
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <div className="form-text">{displayName.length}/100 characters</div>
            </div>

            <div className="mb-3">
              <label htmlFor="description" className="form-label">
                Description
              </label>
              <textarea
                id="description"
                className="form-control"
                rows={4}
                maxLength={2000}
                placeholder="Tell other users about yourself..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="form-text">{description.length}/2000 characters</div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSavingProfile}>
              {isSavingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
