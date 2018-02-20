package main

import "sync"

type CacheListener func(Mail) bool // return "true" to skip adding this to the database

type Cache struct {
	data      map[string][]Mail
	lock      sync.Mutex
	listeners []*CacheListener
}

func NewCache() (c *Cache) {
	c = new(Cache)
	c.data = map[string][]Mail{}
	return
}

func (c *Cache) addListener(l *CacheListener) {
	c.lock.Lock()
	defer c.lock.Unlock()
	c.listeners = append(c.listeners, l)
}

func (c *Cache) removeListener(l *CacheListener) {
	c.lock.Lock()
	defer c.lock.Unlock()
	var listeners []*CacheListener
	for _, v := range c.listeners {
		if l == v {
			listeners = append(listeners, l)
		}
	}
	c.listeners = listeners
}

func (c *Cache) insert(key string, value Mail) {
	c.lock.Lock()
	defer c.lock.Unlock()
	var skip bool
	for _, l := range c.listeners {
		skip = skip || (*l)(value)
	}
	if !skip {
		a, _ := c.data[key]
		c.data[key] = append(a, value)
	}
	// TODO: call handler to update a file/db in a background thread
}

func (c *Cache) remove(key string) (values []Mail) {
	c.lock.Lock()
	defer c.lock.Unlock()
	values, _ = c.data[key]
	delete(c.data, key)
	// TODO: call handler to update a file/db in a background thread
	return
}
