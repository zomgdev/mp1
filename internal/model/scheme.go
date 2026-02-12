package model

import (
	"encoding/json"
	"math"
)

type TreeData map[string]interface{}

type Scheme struct {
	Nodes        []interface{} `json:"nodes"`
	Links        []interface{} `json:"links"`
	NextEntityID int           `json:"nextEntityId"`
	NextLinkNo   int           `json:"nextLinkNo"`
}

func NewDefaultScheme() Scheme {
	return Scheme{
		Nodes:        []interface{}{},
		Links:        []interface{}{},
		NextEntityID: 1,
		NextLinkNo:   1,
	}
}

func NormalizeScheme(raw map[string]interface{}) Scheme {
	scheme := NewDefaultScheme()
	if raw == nil {
		return scheme
	}

	if nodes, ok := raw["nodes"].([]interface{}); ok {
		scheme.Nodes = nodes
	}
	if links, ok := raw["links"].([]interface{}); ok {
		scheme.Links = links
	}
	if nextEntityID, ok := parseJSONInt(raw["nextEntityId"]); ok {
		scheme.NextEntityID = nextEntityID
	}
	if nextLinkNo, ok := parseJSONInt(raw["nextLinkNo"]); ok {
		scheme.NextLinkNo = nextLinkNo
	}

	return scheme
}

func parseJSONInt(v interface{}) (int, bool) {
	switch value := v.(type) {
	case int:
		return value, true
	case int8:
		return int(value), true
	case int16:
		return int(value), true
	case int32:
		return int(value), true
	case int64:
		return int(value), true
	case float32:
		if float32(math.Trunc(float64(value))) == value {
			return int(value), true
		}
	case float64:
		if math.Trunc(value) == value {
			return int(value), true
		}
	case json.Number:
		parsed, err := value.Int64()
		if err == nil {
			return int(parsed), true
		}
	}

	return 0, false
}
