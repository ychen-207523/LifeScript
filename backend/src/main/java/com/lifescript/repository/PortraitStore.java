package com.lifescript.repository;

public interface PortraitStore {
    void put(String key, byte[] png);
    byte[] get(String key);
    void delete(String key);
}
