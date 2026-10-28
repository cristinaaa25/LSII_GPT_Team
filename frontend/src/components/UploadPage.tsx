import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { videoService } from '../services/videoService';

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

interface FormErrors {
  file?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
}

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    if (errors.file) {
      setErrors((prev) => ({ ...prev, file: undefined }));
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setThumbnail(selected);
    if (errors.thumbnail) {
      setErrors((prev) => ({ ...prev, thumbnail: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!file) {
      newErrors.file = 'Video file is required';
    } else {
      const isMp4Type = file.type === 'video/mp4';
      const isMp4Ext = file.name.toLowerCase().endsWith('.mp4');
      if (!isMp4Type && !isMp4Ext) {
        newErrors.file = 'Only MP4 videos are supported';
      } else if (file.size > MAX_FILE_SIZE_BYTES) {
        newErrors.file = 'File size exceeds the 100MB limit';
      }
    }

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length > 255) {
      newErrors.title = 'Title must not exceed 255 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (thumbnail) {
      if (!thumbnail.type.startsWith('image/')) {
        newErrors.thumbnail = 'Thumbnail must be an image file';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);

    if (!validate() || !file) {
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const createdVideo = await videoService.uploadVideo(
        {
          file,
          title,
          description,
          tags,
          category,
          thumbnail,
        },
        (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      );

      navigate(`/videos/${createdVideo.id}`);
    } catch (err: unknown) {
      setUploading(false);
      let message = 'Failed to upload video';
      if (err && typeof err === 'object') {
        const errorObj = err as {
          response?: { data?: { detail?: string; message?: string } };
          message?: string;
        };
        message = errorObj.response?.data?.detail || errorObj.response?.data?.message || errorObj.message || message;
      }
      setServerError(message);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-6">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h3 mb-4">Upload Video</h1>

            {serverError && (
              <div className="alert alert-danger" role="alert">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="video-file" className="form-label">
                  Video File <span className="text-danger">*</span>
                </label>
                <input
                  type="file"
                  id="video-file"
                  aria-label="Video File"
                  accept="video/mp4"
                  className={`form-control ${errors.file ? 'is-invalid' : ''}`}
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <div className="form-text">Supported format: MP4 (max 100MB)</div>
                {errors.file && <div className="invalid-feedback d-block">{errors.file}</div>}
              </div>

              <div className="mb-3">
                <label htmlFor="title" className="form-label">
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  aria-label="Title"
                  className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                  placeholder="Enter video title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  disabled={uploading}
                />
                {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
              </div>

              <div className="mb-3">
                <label htmlFor="description" className="form-label">
                  Description <span className="text-danger">*</span>
                </label>
                <textarea
                  id="description"
                  aria-label="Description"
                  rows={4}
                  className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                  placeholder="Enter video description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
                  }}
                  disabled={uploading}
                />
                {errors.description && <div className="invalid-feedback d-block">{errors.description}</div>}
              </div>

              <div className="mb-3">
                <label htmlFor="tags" className="form-label">
                  Tags
                </label>
                <input
                  type="text"
                  id="tags"
                  aria-label="Tags"
                  className="form-control"
                  placeholder="e.g. gaming, funny, tutorial (comma separated)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  disabled={uploading}
                />
              </div>

              <div className="mb-3">
                <label htmlFor="category" className="form-label">
                  Category
                </label>
                <select
                  id="category"
                  aria-label="Category"
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={uploading}
                >
                  <option value="">Select a category</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Music">Music</option>
                  <option value="Education">Education</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Sports">Sports</option>
                  <option value="News">News</option>
                  <option value="Technology">Technology</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="thumbnail-file" className="form-label">
                  Thumbnail (Optional)
                </label>
                <input
                  type="file"
                  id="thumbnail-file"
                  aria-label="Thumbnail"
                  accept="image/*"
                  className={`form-control ${errors.thumbnail ? 'is-invalid' : ''}`}
                  onChange={handleThumbnailChange}
                  disabled={uploading}
                />
                <div className="form-text">Optional. If not provided, a thumbnail will be generated automatically.</div>
                {errors.thumbnail && <div className="invalid-feedback d-block">{errors.thumbnail}</div>}
              </div>

              {uploading && (
                <div
                  className="progress mb-3"
                  role="progressbar"
                  aria-label="Upload progress"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated"
                    style={{ width: `${uploadProgress}%` }}
                  >
                    {uploadProgress}%
                  </div>
                </div>
              )}

              <div className="d-flex align-items-center">
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Video'
                  )}
                </button>
                <Link to="/" className="btn btn-outline-secondary ms-2" tabIndex={uploading ? -1 : 0}>
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
