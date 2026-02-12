package model

type DiscoveryHost struct {
	ID       int    `json:"id"`
	FQDN     string `json:"fqdn"`
	IP       string `json:"ip"`
	Status   string `json:"status"`
	Login    string `json:"login"`
	Key      string `json:"key"`
	Password string `json:"password"`
}
