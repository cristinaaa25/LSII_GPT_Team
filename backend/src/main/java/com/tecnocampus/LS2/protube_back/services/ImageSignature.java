package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

/**
 * Checks the magic bytes of an uploaded image, so a file is accepted only if its content really is a PNG, JPEG or
 * WebP image of the declared content type. Content type and file name are chosen by the client and can lie
 * (e.g. a text or SVG file sent as {@code image/png}).
 */
final class ImageSignature {

    static final String INVALID_IMAGE = "File content is not a valid PNG, JPG or WEBP image";

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] RIFF = {'R', 'I', 'F', 'F'};
    private static final byte[] WEBP = {'W', 'E', 'B', 'P'};
    private static final int HEADER_LENGTH = 12;

    private ImageSignature() {
    }

    /** Content type detected from the first bytes ({@code image/png}, {@code image/jpeg}, {@code image/webp}) or null. */
    static String detect(byte[] header) {
        if (header == null) {
            return null;
        }
        if (startsWith(header, PNG, 0)) {
            return "image/png";
        }
        if (startsWith(header, JPEG, 0)) {
            return "image/jpeg";
        }
        if (startsWith(header, RIFF, 0) && startsWith(header, WEBP, 8)) {
            return "image/webp";
        }
        return null;
    }

    /**
     * Throws {@link InvalidRequestException} (400) unless the file starts with the signature of
     * {@code declaredContentType}, which must already be one of the whitelisted image types.
     */
    static void requireMatches(MultipartFile file, String declaredContentType) {
        String detected = detect(readHeader(file));
        if (detected == null || declaredContentType == null
                || !detected.equals(declaredContentType.toLowerCase(Locale.ROOT))) {
            throw new InvalidRequestException(INVALID_IMAGE);
        }
    }

    private static byte[] readHeader(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            return in.readNBytes(HEADER_LENGTH);
        } catch (IOException e) {
            throw new InvalidRequestException(INVALID_IMAGE);
        }
    }

    private static boolean startsWith(byte[] data, byte[] prefix, int offset) {
        if (data.length < offset + prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (data[offset + i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
