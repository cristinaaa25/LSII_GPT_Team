package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.TestImages;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ImageSignatureTest {

    @Test
    void detectsPngJpegAndWebp() {
        assertThat(ImageSignature.detect(TestImages.png())).isEqualTo("image/png");
        assertThat(ImageSignature.detect(TestImages.jpeg())).isEqualTo("image/jpeg");
        assertThat(ImageSignature.detect(TestImages.webp())).isEqualTo("image/webp");
    }

    @Test
    void rejectsOtherOrShortContent() {
        assertThat(ImageSignature.detect(null)).isNull();
        assertThat(ImageSignature.detect(new byte[0])).isNull();
        assertThat(ImageSignature.detect("just some text".getBytes())).isNull();
        assertThat(ImageSignature.detect("<svg><script>alert(1)</script></svg>".getBytes())).isNull();
        assertThat(ImageSignature.detect("GIF89a-------".getBytes())).isNull();
        // RIFF container that is not WebP (e.g. a WAV file)
        assertThat(ImageSignature.detect("RIFF\0\0\0\0WAVEfmt ".getBytes())).isNull();
        // Truncated PNG signature
        assertThat(ImageSignature.detect(new byte[]{(byte) 0x89, 'P', 'N'})).isNull();
    }

    @Test
    void requireMatchesAcceptsMatchingTypeIgnoringCase() {
        MockMultipartFile png = new MockMultipartFile("f", "a.png", "image/png", TestImages.png());
        assertThatCode(() -> ImageSignature.requireMatches(png, "IMAGE/PNG")).doesNotThrowAnyException();
    }

    @Test
    void requireMatchesRejectsFakeOrMismatchedImages() {
        MockMultipartFile text = new MockMultipartFile("f", "a.png", "image/png", "just some text".getBytes());
        assertThatThrownBy(() -> ImageSignature.requireMatches(text, "image/png"))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage(ImageSignature.INVALID_IMAGE);

        MockMultipartFile jpeg = new MockMultipartFile("f", "a.png", "image/png", TestImages.jpeg());
        assertThatThrownBy(() -> ImageSignature.requireMatches(jpeg, "image/png"))
                .isInstanceOf(InvalidRequestException.class);

        MockMultipartFile png = new MockMultipartFile("f", "a.png", "image/png", TestImages.png());
        assertThatThrownBy(() -> ImageSignature.requireMatches(png, null))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void unreadableFileIsRejected() throws IOException {
        MultipartFile broken = mock(MultipartFile.class);
        when(broken.getInputStream()).thenThrow(new IOException("disk error"));

        assertThatThrownBy(() -> ImageSignature.requireMatches(broken, "image/png"))
                .isInstanceOf(InvalidRequestException.class);
    }
}
