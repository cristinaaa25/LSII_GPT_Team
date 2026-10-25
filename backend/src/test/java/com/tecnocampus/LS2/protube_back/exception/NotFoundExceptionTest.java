package com.tecnocampus.LS2.protube_back.exception;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class NotFoundExceptionTest {

    @Test
    void testMessage() {
        NotFoundException ex = new NotFoundException("Not found");
        assertThat(ex.getMessage()).isEqualTo("Not found");
    }
}
