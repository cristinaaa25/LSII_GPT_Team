package com.tecnocampus.LS2.protube_back.exception;

/**
 * A Google login that must be rejected. The error code is sent to the SPA as {@code /login?error=<code>}.
 */
public class GoogleLoginException extends RuntimeException {

    /** Generic failure: missing or unverified Google data, or any unexpected error. */
    public static final String GENERIC = "google";
    /** A local (password) account already uses the Google email: we never link them automatically. */
    public static final String EMAIL_EXISTS = "google_email_exists";

    private final String errorCode;

    public GoogleLoginException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
