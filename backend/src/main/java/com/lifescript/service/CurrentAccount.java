package com.lifescript.service;

import org.springframework.stereotype.Component;

/** Local development identity. Replace with authenticated identity before public deployment. */
@Component
public class CurrentAccount {

    public String id() {
        return "local-development-account";
    }
}
