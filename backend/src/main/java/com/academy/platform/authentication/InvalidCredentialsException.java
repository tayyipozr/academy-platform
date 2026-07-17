package com.academy.platform.authentication;

public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException() {
        super("Invalid login credentials.");
    }
}
