package main

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type Mail struct {
	To      string    `json:"to"`
	From    string    `json:"from"`
	Message string    `json:"message"`
	Date    time.Time `json:"date"`
}

func cacheHandler(c *Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println(err)
			return
		}
		arr := strings.Split(r.URL.EscapedPath(), "/")
		name := arr[len(arr)-1]
		if name == "" {
			http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
			return
		}
		log.Printf("connected: %s\n", name)
		// read queued messages
		for _, m := range c.remove(name) {
			if err := conn.WriteJSON(m); err != nil {
				log.Println(err)
				return
			}
		}
		// listen for new messages
		var l CacheListener = func(m Mail) bool {
			if m.To == name {
				go conn.WriteJSON(m) // TODO: handle error
				log.Printf("delivered: %+v", m)
				return true
			}
			return false
		}
		c.addListener(&l)
		defer c.removeListener(&l)
		defer log.Printf("disconnected: %s\n", name)
		// handle incoming messages
		for {
			var m Mail
			if err := conn.ReadJSON(&m); err != nil {
				log.Println(err)
				return // TODO: handle error
			}
			log.Printf("recieved: %+v\n", m)
			m.From = name
			m.Date = time.Now().UTC()
			c.insert(m.To, m)
		}
	}
}

func main() {
	c := NewCache()
	var l CacheListener = func(m Mail) bool {
		log.Printf("recieved: %+v\n", m)
		return false
	}
	c.addListener(&l)
	http.HandleFunc("/", cacheHandler(c))
	log.Println("listening on 8001")
	http.ListenAndServe(":8001", nil)
}
