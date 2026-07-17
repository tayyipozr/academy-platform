package com.academy.platform.common;

import java.time.Instant;
import java.util.List;

import com.academy.platform.authentication.InvalidCredentialsException;

import org.springframework.http.HttpStatus;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import jakarta.validation.ConstraintViolationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InvalidCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiErrorResponse handleInvalidCredentials(
            InvalidCredentialsException exception
    ) {
        return new ApiErrorResponse(
                "INVALID_CREDENTIALS",
                exception.getMessage(),
                List.of(),
                Instant.now()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiErrorResponse handleValidation(
            MethodArgumentNotValidException exception
    ) {
        List<ApiErrorResponse.FieldErrorResponse> fieldErrors =
                exception.getBindingResult()
                        .getFieldErrors()
                        .stream()
                        .map(this::mapFieldError)
                        .toList();

        return new ApiErrorResponse(
                "VALIDATION_ERROR",
                "One or more fields are invalid.",
                fieldErrors,
                Instant.now()
        );
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiErrorResponse handleNotFound(
            ResourceNotFoundException exception
    ) {
        return new ApiErrorResponse(
                "RESOURCE_NOT_FOUND",
                exception.getMessage(),
                List.of(),
                Instant.now()
        );
    }
    
    @ExceptionHandler(ConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiErrorResponse handleConflict(
            ConflictException exception
    ) {
        return new ApiErrorResponse(
                "RESOURCE_CONFLICT",
                exception.getMessage(),
                List.of(),
                Instant.now()
        );
    }
    
    @ExceptionHandler(BusinessRuleException.class)
    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public ApiErrorResponse handleBusinessRule(
            BusinessRuleException exception
    ) {
        return new ApiErrorResponse(
                "BUSINESS_RULE_VIOLATION",
                exception.getMessage(),
                List.of(),
                Instant.now()
        );
    }

    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiErrorResponse handleConstraintViolation(
            ConstraintViolationException exception
    ) {
        List<ApiErrorResponse.FieldErrorResponse> fieldErrors =
                exception.getConstraintViolations()
                        .stream()
                        .map(violation ->
                                new ApiErrorResponse.FieldErrorResponse(
                                        violation.getPropertyPath()
                                                .toString(),
                                        violation.getMessage()
                                )
                        )
                        .toList();
    
        return new ApiErrorResponse(
                "VALIDATION_ERROR",
                "One or more request parameters are invalid.",
                fieldErrors,
                Instant.now()
        );
    }    

    private ApiErrorResponse.FieldErrorResponse mapFieldError(
            FieldError error
    ) {
        String message = error.getDefaultMessage() == null
                ? "Invalid value."
                : error.getDefaultMessage();

        return new ApiErrorResponse.FieldErrorResponse(
                error.getField(),
                message
        );
    }

    
}