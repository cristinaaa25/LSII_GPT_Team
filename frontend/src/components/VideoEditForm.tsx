import React, { useState } from 'react';
import TagListEditor from './TagListEditor';
import { videoService } from '../services/videoService';
import type { VideoDetail } from '../types/video';

// Same limits as the backend VideoUpdateRequestDto
const TITLE_MAX = 255;
const DESCRIPTION_MAX = 5000;
const TAGS_MAX = 20;
const TAG_LENGTH_MAX = 50;
const CATEGORIES_MAX = 5;
const CATEGORY_LENGTH_MAX = 100;

interface Props {
  video: VideoDetail & { id: number };
  onSaved: (updated: VideoDetail) => void;
  onCancel: () => void;
}

const errorMessage = (err: unknown): string => {
  const errorObj = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
  if (errorObj?.response?.status === 401) return 'Your session has expired. Please log in again.';
  if (errorObj?.response?.status === 403) return 'You can only edit your own videos.';
  return errorObj?.response?.data?.detail || errorObj?.message || 'Failed to save changes';
};

const VideoEditForm: React.FC<Props> = ({ video, onSaved, onCancel }) => {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? '');
  const [tags, setTags] = useState<string[]>(video.tags ?? []);
  const [categories, setCategories] = useState<string[]>(video.categories ?? []);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const validate = (): string | null => {
    if (!title.trim()) return 'Title is required';
    if (!description.trim()) return 'Description is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    setValidationError(problem);
    if (problem) return;

    setSaving(true);
    setServerError(null);
    try {
      const updated = await videoService.updateVideo(video.id, {
        title: title.trim(),
        description: description.trim(),
        tags,
        categories,
      });
      onSaved(updated);
    } catch (err: unknown) {
      setServerError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form className="card p-3 mb-4 text-start" onSubmit={handleSubmit} aria-label="Edit video" noValidate>
      <h2 className="h5 mb-3">Edit video</h2>

      {serverError && (
        <div className="alert alert-danger" role="alert">
          {serverError}
        </div>
      )}
      {validationError && (
        <div className="alert alert-warning" role="alert">
          {validationError}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="edit-title" className="form-label">
          Title
        </label>
        <input
          id="edit-title"
          type="text"
          className="form-control"
          value={title}
          maxLength={TITLE_MAX}
          required
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="edit-description" className="form-label">
          Description
        </label>
        <textarea
          id="edit-description"
          className="form-control"
          rows={4}
          value={description}
          maxLength={DESCRIPTION_MAX}
          required
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <TagListEditor
        id="edit-tags"
        label="Tags"
        values={tags}
        onChange={setTags}
        maxItems={TAGS_MAX}
        maxLength={TAG_LENGTH_MAX}
        placeholder="Add a tag"
      />

      <TagListEditor
        id="edit-categories"
        label="Categories"
        values={categories}
        onChange={setCategories}
        maxItems={CATEGORIES_MAX}
        maxLength={CATEGORY_LENGTH_MAX}
        placeholder="Add a category"
      />

      <div className="d-flex gap-2 justify-content-end">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};

export default VideoEditForm;
