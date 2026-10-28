# Video upload: authenticated users upload videos (US-06)

**Approved on:** pending (PR #<n>)
**Approved by:** <team members / PR link>
**Used for:** full-stack feature implementing video upload (backend multipart REST endpoint, ffmpeg thumbnail generation with optional custom image upload, atomic file move & cleanup, React upload page behind ProtectedRoute with upload progress bar, and comprehensive test suite).

## Prompt

```
Implement US-06 from REQUIREMENT.md: authenticated users upload videos.
1. POST /api/videos (multipart): file + title, description, tags, category. Authenticated users only.
2. Accept only video/mp4 and respect the 100MB limit already configured; 400/413 with clear messages.
3. Store it in pro_tube.store.dir with a new id. Thumbnail: <generate with ffmpeg | optional image upload>.
   Write to a temp file and move it at the end: a failed upload leaves no partial file and no DB row.
4. Frontend /upload behind ProtectedRoute: validated form, progress bar (axios onUploadProgress), redirect
   to the new video on success, visible errors.
5. Tests: MockMultipartFile + @TempDir (success, wrong type, too big, unauthenticated) and the frontend form.
```

## Notes

* Tool: Antigravity
* Model: Gemini 3.8 Flash
* Backend:
  - `POST /api/videos` multipart endpoint in `VideosController`.
  - Only authenticated users can upload (`SecurityConfig` protects `/api/**`).
  - Validation ensures `file` is `video/mp4` and size <= 100MB. Handlers for `MaxUploadSizeExceededException` return 413 Payload Too Large; invalid request parts return 400 Bad Request.
  - Video and optional thumbnail are written to temporary files first. If no thumbnail is provided, thumbnail is extracted via `ffmpeg` (fallback to null if ffmpeg is unavailable). Metadata duration/width/height are optionally probed via `ffprobe`.
  - Files are moved to `pro_tube.store.dir` with a generated unique ID. If database persistence or moving fails, target files are deleted and temp files are cleared, ensuring no partial files and no DB rows remain.
  - `VideosControllerTest`, `VideoServiceTest`, and `VideoUploadIntegrationTest` verify success, wrong type, size limit (>100MB), unauthenticated access, and optional thumbnail uploads with `@TempDir` and `MockMultipartFile`.
* Frontend:
  - `src/services/videoService.ts`: `uploadVideo` method using `axios.post` with multipart FormData, auth header, and `onUploadProgress`.
  - `UploadPage.tsx`: Validated form behind `ProtectedRoute` with progress bar, validation feedback, and server error handling.
  - `App.tsx`: Route `/upload` protected by `ProtectedRoute`.
  - `Header.tsx`: Upload link in header when authenticated.
  - `UploadPage.test.tsx` and `videoService.test.ts`: Complete test coverage.
