package sections

import (
	"reflect"
	"testing"
)

func TestParseConfigString(t *testing.T) {
	parser := NewConfigParser()

	tests := []struct {
		name     string
		input    string
		expected map[string]string
	}{
		{
			name:     "empty string",
			input:    "",
			expected: map[string]string{},
		},
		{
			name:     "single key-value",
			input:    "key: value",
			expected: map[string]string{"key": "value"},
		},
		{
			name:     "multiple key-values",
			input:    "key1: value1; key2: value2",
			expected: map[string]string{"key1": "value1", "key2": "value2"},
		},
		{
			name:     "with spaces",
			input:    "  key1: value1 ;  key2: value2  ",
			expected: map[string]string{"key1": "value1", "key2": "value2"},
		},
		{
			name:     "nested braces",
			input:    "position: {x: 10, y: 20}; color: blue",
			expected: map[string]string{"position": "{x: 10, y: 20}", "color": "blue"},
		},
		{
			name:     "array value",
			input:    "tags: [tag1, tag2, tag3]; priority: high",
			expected: map[string]string{"tags": "[tag1, tag2, tag3]", "priority": "high"},
		},
		{
			name:     "complex nested",
			input:    "size: {width: 100, height: 50}; position: {x: 0, y: 0}",
			expected: map[string]string{"size": "{width: 100, height: 50}", "position": "{x: 0, y: 0}"},
		},
		{
			name:     "date value",
			input:    "due_date: 2026-02-15; assignee: john",
			expected: map[string]string{"due_date": "2026-02-15", "assignee": "john"},
		},
		{
			name:     "underscore keys",
			input:    "planned_start: 2026-01-01; planned_end: 2026-12-31",
			expected: map[string]string{"planned_start": "2026-01-01", "planned_end": "2026-12-31"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parser.ParseConfigString(tt.input)
			if !reflect.DeepEqual(result, tt.expected) {
				t.Errorf("ParseConfigString(%q) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestParseArray(t *testing.T) {
	parser := NewConfigParser()

	tests := []struct {
		name     string
		input    string
		expected []string
	}{
		{
			name:     "empty array",
			input:    "[]",
			expected: nil, // Implementation returns nil for empty
		},
		{
			name:     "single item",
			input:    "[item1]",
			expected: []string{"item1"},
		},
		{
			name:     "multiple items",
			input:    "[item1, item2, item3]",
			expected: []string{"item1", "item2", "item3"},
		},
		{
			name:     "with spaces",
			input:    "[ item1 , item2 , item3 ]",
			expected: []string{"item1", "item2", "item3"},
		},
		{
			name:     "no brackets",
			input:    "item1, item2",
			expected: []string{"item1", "item2"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parser.ParseArray(tt.input)
			if !reflect.DeepEqual(result, tt.expected) {
				t.Errorf("ParseArray(%q) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestParseInt(t *testing.T) {
	parser := NewConfigParser()

	tests := []struct {
		name         string
		input        string
		defaultValue int
		expected     int
	}{
		{"valid integer", "42", 0, 42},
		{"negative integer", "-10", 0, -10},
		{"empty string", "", 5, 5},
		{"invalid string", "abc", 7, 7},
		{"float string", "3.14", 0, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parser.ParseInt(tt.input, tt.defaultValue)
			if result != tt.expected {
				t.Errorf("ParseInt(%q, %d) = %d, want %d", tt.input, tt.defaultValue, result, tt.expected)
			}
		})
	}
}

func TestParseFloat(t *testing.T) {
	parser := NewConfigParser()

	tests := []struct {
		name         string
		input        string
		defaultValue float64
		expected     float64
	}{
		{"valid float", "3.14", 0, 3.14},
		{"integer as float", "42", 0, 42.0},
		{"negative float", "-2.5", 0, -2.5},
		{"empty string", "", 1.5, 1.5},
		{"invalid string", "abc", 2.0, 2.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parser.ParseFloat(tt.input, tt.defaultValue)
			if result != tt.expected {
				t.Errorf("ParseFloat(%q, %f) = %f, want %f", tt.input, tt.defaultValue, result, tt.expected)
			}
		})
	}
}

func TestParseBool(t *testing.T) {
	parser := NewConfigParser()

	tests := []struct {
		name         string
		input        string
		defaultValue bool
		expected     bool
	}{
		{"true", "true", false, true},
		{"false", "false", true, false},
		{"yes", "yes", false, true},
		{"no", "no", true, false},
		{"1", "1", false, true},
		{"0", "0", true, false},
		{"empty string", "", true, true},
		{"invalid string", "maybe", false, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parser.ParseBool(tt.input, tt.defaultValue)
			if result != tt.expected {
				t.Errorf("ParseBool(%q, %v) = %v, want %v", tt.input, tt.defaultValue, result, tt.expected)
			}
		})
	}
}

func TestParsePosition(t *testing.T) {
	parser := NewConfigParser()

	tests := []struct {
		name      string
		input     string
		expectedX float64
		expectedY float64
	}{
		{"valid position", "{x: 100, y: 200}", 100, 200},
		{"with spaces", "{ x: 50 , y: 75 }", 50, 75},
		{"negative values", "{x: -10, y: -20}", -10, -20},
		{"floats", "{x: 10.5, y: 20.5}", 10.5, 20.5},
		{"empty string", "", 0, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			x, y := parser.ParsePosition(tt.input)
			if x != tt.expectedX || y != tt.expectedY {
				t.Errorf("ParsePosition(%q) = (%f, %f), want (%f, %f)", tt.input, x, y, tt.expectedX, tt.expectedY)
			}
		})
	}
}

func TestParseSize(t *testing.T) {
	parser := NewConfigParser()

	tests := []struct {
		name           string
		input          string
		expectedWidth  float64
		expectedHeight float64
	}{
		{"valid size", "{width: 100, height: 200}", 100, 200},
		{"with spaces", "{ width: 50 , height: 75 }", 50, 75},
		{"empty string returns defaults", "", 200, 150},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w, h := parser.ParseSize(tt.input)
			if w != tt.expectedWidth || h != tt.expectedHeight {
				t.Errorf("ParseSize(%q) = (%f, %f), want (%f, %f)", tt.input, w, h, tt.expectedWidth, tt.expectedHeight)
			}
		})
	}
}

func TestSerializeConfig(t *testing.T) {
	parser := NewConfigParser()

	tests := []struct {
		name     string
		input    map[string]string
		contains []string
	}{
		{
			name:     "empty map",
			input:    map[string]string{},
			contains: []string{},
		},
		{
			name:     "single key-value",
			input:    map[string]string{"key": "value"},
			contains: []string{"key: value"},
		},
		{
			name:     "multiple key-values",
			input:    map[string]string{"key1": "value1", "key2": "value2"},
			contains: []string{"key1: value1", "key2: value2"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parser.SerializeConfig(tt.input)
			for _, expected := range tt.contains {
				if len(expected) > 0 && !contains(result, expected) {
					t.Errorf("SerializeConfig(%v) = %q, want to contain %q", tt.input, result, expected)
				}
			}
		})
	}
}

func TestSerializeArray(t *testing.T) {
	parser := NewConfigParser()

	tests := []struct {
		name     string
		input    []string
		expected string
	}{
		{"empty array", []string{}, "[]"},
		{"single item", []string{"item1"}, "[item1]"},
		{"multiple items", []string{"item1", "item2", "item3"}, "[item1, item2, item3]"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parser.SerializeArray(tt.input)
			if result != tt.expected {
				t.Errorf("SerializeArray(%v) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > 0 && len(substr) > 0 && stringContains(s, substr)))
}

func stringContains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
