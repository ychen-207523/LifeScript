package com.lifescript.api;

import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class ApiErrors extends ResponseEntityExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ProblemDetail> status(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(
            ProblemDetail.forStatusAndDetail(exception.getStatusCode(), exception.getReason())
        );
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
        MethodArgumentNotValidException exception,
        HttpHeaders headers,
        HttpStatusCode status,
        org.springframework.web.context.request.WebRequest request
    ) {
        var problem = ProblemDetail.forStatusAndDetail(
            status,
            "Check the highlighted fields and try again."
        );
        var fields = new java.util.LinkedHashMap<String, String>();
        exception
            .getBindingResult()
            .getFieldErrors()
            .forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        problem.setProperty("fields", fields);
        return ResponseEntity.status(status).body(problem);
    }

    @Override
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(
        MaxUploadSizeExceededException exception,
        HttpHeaders headers,
        HttpStatusCode status,
        org.springframework.web.context.request.WebRequest request
    ) {
        return ResponseEntity.status(413).body(
            ProblemDetail.forStatusAndDetail(
                HttpStatus.PAYLOAD_TOO_LARGE,
                "Portraits must be 5 MB or smaller."
            )
        );
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> unexpected(Exception exception) {
        LoggerFactory.getLogger(ApiErrors.class).error("Request failed", exception);
        return ResponseEntity.status(503).body(
            ProblemDetail.forStatusAndDetail(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Storage is unavailable. Please try again."
            )
        );
    }
}
