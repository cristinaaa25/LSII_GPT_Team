package com.tecnocampus.LS2.protube_back;

import java.nio.charset.StandardCharsets;

/** Minimal byte arrays that start with real image signatures (magic bytes), for upload tests. */
public final class TestImages {

    private TestImages() {
    }

    public static byte[] png() {
        return withTail(new byte[]{(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'});
    }

    public static byte[] jpeg() {
        return withTail(new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0});
    }

    public static byte[] webp() {
        return withTail(new byte[]{'R', 'I', 'F', 'F', 0x24, 0, 0, 0, 'W', 'E', 'B', 'P'});
    }

    private static byte[] withTail(byte[] header) {
        byte[] tail = "image-body".getBytes(StandardCharsets.US_ASCII);
        byte[] result = new byte[header.length + tail.length];
        System.arraycopy(header, 0, result, 0, header.length);
        System.arraycopy(tail, 0, result, header.length, tail.length);
        return result;
    }
}
