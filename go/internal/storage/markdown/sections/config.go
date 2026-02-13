package sections

import (
	"crypto/rand"
	"encoding/hex"
	"strconv"
	"strings"
)

// generateID creates a random 8-character hex ID
func generateID() string {
	bytes := make([]byte, 4)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// ConfigParser parses task/entity configuration strings
// Format: {key: value; key2: [array]; key3: {nested}}
type ConfigParser struct{}

// NewConfigParser creates a new config parser
func NewConfigParser() *ConfigParser {
	return &ConfigParser{}
}

// ParseConfigString parses a config string into key-value pairs
// Handles nested braces and arrays correctly
func (p *ConfigParser) ParseConfigString(configStr string) map[string]string {
	result := make(map[string]string)
	if configStr == "" {
		return result
	}

	// Remove surrounding braces if present
	configStr = strings.TrimSpace(configStr)
	if strings.HasPrefix(configStr, "{") && strings.HasSuffix(configStr, "}") {
		configStr = configStr[1 : len(configStr)-1]
	}

	// Parse key-value pairs, respecting nested braces
	var currentKey string
	var currentValue strings.Builder
	var depth int // Track brace/bracket depth

	for i := 0; i < len(configStr); i++ {
		ch := configStr[i]

		switch ch {
		case '{', '[':
			depth++
			currentValue.WriteByte(ch)
		case '}', ']':
			depth--
			currentValue.WriteByte(ch)
		case ':':
			if depth == 0 && currentKey == "" {
				currentKey = strings.TrimSpace(currentValue.String())
				currentValue.Reset()
			} else {
				currentValue.WriteByte(ch)
			}
		case ';':
			if depth == 0 {
				// End of key-value pair
				if currentKey != "" {
					result[currentKey] = strings.TrimSpace(currentValue.String())
				}
				currentKey = ""
				currentValue.Reset()
			} else {
				currentValue.WriteByte(ch)
			}
		default:
			currentValue.WriteByte(ch)
		}
	}

	// Handle last pair
	if currentKey != "" {
		result[currentKey] = strings.TrimSpace(currentValue.String())
	}

	return result
}

// ParseArray parses a bracketed array string into a slice
// Format: [item1, item2, item3] or item1, item2, item3
func (p *ConfigParser) ParseArray(arrayStr string) []string {
	arrayStr = strings.TrimSpace(arrayStr)
	if arrayStr == "" {
		return nil
	}

	// Remove brackets if present
	if strings.HasPrefix(arrayStr, "[") && strings.HasSuffix(arrayStr, "]") {
		arrayStr = arrayStr[1 : len(arrayStr)-1]
	}

	if arrayStr == "" {
		return nil
	}

	// Split by comma and trim each item
	parts := strings.Split(arrayStr, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

// ParseInt parses an integer with default value
func (p *ConfigParser) ParseInt(s string, defaultVal int) int {
	s = strings.TrimSpace(s)
	if s == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(s)
	if err != nil {
		return defaultVal
	}
	return val
}

// ParseFloat parses a float with default value
func (p *ConfigParser) ParseFloat(s string, defaultVal float64) float64 {
	s = strings.TrimSpace(s)
	if s == "" {
		return defaultVal
	}
	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return defaultVal
	}
	return val
}

// ParseBool parses a boolean with default value
func (p *ConfigParser) ParseBool(s string, defaultVal bool) bool {
	s = strings.TrimSpace(strings.ToLower(s))
	if s == "" {
		return defaultVal
	}
	return s == "true" || s == "1" || s == "yes"
}

// ParsePosition parses a position object {x: 100, y: 200}
func (p *ConfigParser) ParsePosition(posStr string) (x, y float64) {
	posStr = strings.TrimSpace(posStr)
	if posStr == "" {
		return 0, 0
	}

	// Remove braces
	if strings.HasPrefix(posStr, "{") && strings.HasSuffix(posStr, "}") {
		posStr = posStr[1 : len(posStr)-1]
	}

	parts := strings.Split(posStr, ",")
	for _, part := range parts {
		kv := strings.SplitN(part, ":", 2)
		if len(kv) != 2 {
			continue
		}
		key := strings.TrimSpace(kv[0])
		val := strings.TrimSpace(kv[1])

		switch key {
		case "x":
			x = p.ParseFloat(val, 0)
		case "y":
			y = p.ParseFloat(val, 0)
		}
	}
	return
}

// ParseSize parses a size object {width: 200, height: 150}
func (p *ConfigParser) ParseSize(sizeStr string) (width, height float64) {
	sizeStr = strings.TrimSpace(sizeStr)
	if sizeStr == "" {
		return 200, 150 // Defaults
	}

	// Remove braces
	if strings.HasPrefix(sizeStr, "{") && strings.HasSuffix(sizeStr, "}") {
		sizeStr = sizeStr[1 : len(sizeStr)-1]
	}

	parts := strings.Split(sizeStr, ",")
	width, height = 200, 150 // Defaults
	for _, part := range parts {
		kv := strings.SplitN(part, ":", 2)
		if len(kv) != 2 {
			continue
		}
		key := strings.TrimSpace(kv[0])
		val := strings.TrimSpace(kv[1])

		switch key {
		case "width":
			width = p.ParseFloat(val, 200)
		case "height":
			height = p.ParseFloat(val, 150)
		}
	}
	return
}

// SerializeConfig serializes a map to a config string
func (p *ConfigParser) SerializeConfig(config map[string]string) string {
	if len(config) == 0 {
		return ""
	}

	var parts []string
	for key, value := range config {
		parts = append(parts, key+": "+value)
	}
	return "{" + strings.Join(parts, "; ") + "}"
}

// SerializeArray serializes a slice to an array string
func (p *ConfigParser) SerializeArray(items []string) string {
	if len(items) == 0 {
		return "[]"
	}
	return "[" + strings.Join(items, ", ") + "]"
}
