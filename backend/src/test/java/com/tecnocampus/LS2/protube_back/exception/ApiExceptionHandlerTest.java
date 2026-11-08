package com.tecnocampus.LS2.protube_back.exception;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import static org.assertj.core.api.Assertions.assertThat;

class ApiExceptionHandlerTest {

    private final ApiExceptionHandler handler = new ApiExceptionHandler();

    @Test
    void dataIntegrityViolationIsAConflictWithoutDatabaseDetails() {
        ProblemDetail problem = handler.handleDataIntegrityViolation(
                new DataIntegrityViolationException("duplicate key value violates unique constraint \"uk_comment_like\""));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(problem.getDetail()).doesNotContain("uk_comment_like");
    }

    @Test
    void handlesSpecificExceptionsProperly() {
        ProblemDetail invalid = handler.handleInvalidRequest(new InvalidRequestException("bad payload"));
        assertThat(invalid.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(invalid.getDetail()).isEqualTo("bad payload");

        ProblemDetail notFound = handler.handleNotFound(new NotFoundException("missing resource"));
        assertThat(notFound.getStatus()).isEqualTo(HttpStatus.NOT_FOUND.value());
        assertThat(notFound.getDetail()).isEqualTo("missing resource");

        ProblemDetail forbidden = handler.handleForbidden(new ForbiddenException("denied"));
        assertThat(forbidden.getStatus()).isEqualTo(HttpStatus.FORBIDDEN.value());
        assertThat(forbidden.getDetail()).isEqualTo("denied");

        ProblemDetail conflict = handler.handleConflict(new ConflictException("already exists"));
        assertThat(conflict.getStatus()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(conflict.getDetail()).isEqualTo("already exists");

        ProblemDetail badCreds = handler.handleBadCredentials(new BadCredentialsException("bad password"));
        assertThat(badCreds.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(badCreds.getDetail()).isEqualTo("bad password");

        ProblemDetail authEx = handler.handleAuthentication(new AuthenticationException("auth failure") {});
        assertThat(authEx.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(authEx.getDetail()).isEqualTo("auth failure");

        ProblemDetail maxUpload = handler.handleMaxUploadSizeExceeded(new MaxUploadSizeExceededException(1024 * 1024 * 100));
        assertThat(maxUpload.getStatus()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE.value());
        assertThat(maxUpload.getDetail()).isEqualTo("File size exceeds the 100MB limit");

        ProblemDetail missingPart = handler.handleMissingRequestPart(new MissingServletRequestPartException("file"));
        assertThat(missingPart.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
    }

    @Test
    void handlesValidationExceptions() throws NoSuchMethodException {
        // Validation exception with field errors
        var target = new Object();
        var bindingResultWithErrors = new BeanPropertyBindingResult(target, "target");
        bindingResultWithErrors.addError(new FieldError("target", "field1", "field1 is required"));
        bindingResultWithErrors.addError(new FieldError("target", "field2", "field2 must be positive"));

        var method = Object.class.getMethod("toString");
        var param = new org.springframework.core.MethodParameter(method, -1);
        var exWithErrors = new MethodArgumentNotValidException(param, bindingResultWithErrors);

        ProblemDetail problemWithErrors = handler.handleValidation(exWithErrors);
        assertThat(problemWithErrors.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(problemWithErrors.getDetail()).contains("field1 is required", "field2 must be positive");

        // Validation exception with blank detail
        var emptyBindingResult = new BeanPropertyBindingResult(target, "target");
        var exBlank = new MethodArgumentNotValidException(param, emptyBindingResult);
        ProblemDetail problemBlank = handler.handleValidation(exBlank);
        assertThat(problemBlank.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(problemBlank.getDetail()).isEqualTo("Invalid request content");
    }
}
