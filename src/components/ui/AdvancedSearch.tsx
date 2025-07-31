import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  Calendar, 
  User, 
  Tag, 
  Clock,
  ChevronDown,
  SlidersHorizontal,
  Save,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Input from './Input';

interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: any;
  label?: string;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: SearchFilter[];
  isDefault?: boolean;
}

interface AdvancedSearchProps {
  onSearch: (query: string, filters: SearchFilter[]) => void;
  placeholder?: string;
  searchableFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'number' | 'multiselect';
    options?: Array<{ value: any; label: string }>;
  }>;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, filters: SearchFilter[]) => void;
  onDeleteFilter?: (filterId: string) => void;
  className?: string;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  placeholder = "Search...",
  searchableFields = [],
  savedFilters = [],
  onSaveFilter,
  onDeleteFilter,
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query, filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filters, onSearch]);

  const addFilter = () => {
    const newFilter: SearchFilter = {
      field: searchableFields[0]?.key || 'name',
      operator: 'contains',
      value: ''
    };
    setFilters([...filters, newFilter]);
  };

  const updateFilter = (index: number, updates: Partial<SearchFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const clearAllFilters = () => {
    setFilters([]);
    setQuery('');
  };

  const loadSavedFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
    setShowAdvanced(true);
  };

  const saveCurrentFilter = () => {
    if (filterName.trim() && onSaveFilter) {
      onSaveFilter(filterName.trim(), filters);
      setFilterName('');
      setShowSaveDialog(false);
    }
  };

  const getFieldType = (fieldKey: string) => {
    return searchableFields.find(f => f.key === fieldKey)?.type || 'text';
  };

  const getFieldOptions = (fieldKey: string) => {
    return searchableFields.find(f => f.key === fieldKey)?.options || [];
  };

  const getOperatorOptions = (fieldType: string) => {
    switch (fieldType) {
      case 'text':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' },
          { value: 'startsWith', label: 'Starts with' }
        ];
      case 'select':
      case 'multiselect':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'in', label: 'In' }
        ];
      case 'number':
      case 'date':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'greaterThan', label: 'Greater than' },
          { value: 'lessThan', label: 'Less than' },
          { value: 'between', label: 'Between' }
        ];
      default:
        return [{ value: 'contains', label: 'Contains' }];
    }
  };

  const renderFilterValue = (filter: SearchFilter, index: number) => {
    const fieldType = getFieldType(filter.field);
    const options = getFieldOptions(filter.field);

    switch (fieldType) {
      case 'select':
        return (
          <select
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Select...</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-md min-h-[40px]">
            {options.map((option) => (
              <label key={option.value} className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={Array.isArray(filter.value) && filter.value.includes(option.value)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(filter.value) ? filter.value : [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter(v => v !== option.value);
                    updateFilter(index, { value: newValues });
                  }}
                  className="mr-1"
                />
                {option.label}
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="text-sm"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="text-sm"
            placeholder="Enter number"
          />
        );

      default:
        return (
          <Input
            type="text"
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="text-sm"
            placeholder="Enter value"
          />
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center space-x-2 ${showAdvanced ? 'bg-blue-50 border-blue-300' : ''}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
          {filters.length > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {filters.length}
            </span>
          )}
        </Button>
      </div>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">Saved filters:</span>
          {savedFilters.map((savedFilter) => (
            <Button
              key={savedFilter.id}
              variant="outline"
              size="sm"
              onClick={() => loadSavedFilter(savedFilter)}
              className="flex items-center space-x-1 text-xs"
            >
              <Bookmark className="w-3 h-3" />
              <span>{savedFilter.name}</span>
              {savedFilter.isDefault && (
                <span className="text-blue-600">★</span>
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-gray-200 rounded-lg p-4 bg-gray-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
              <div className="flex items-center space-x-2">
                {filters.length > 0 && onSaveFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSaveDialog(true)}
                    className="flex items-center space-x-1 text-xs"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs"
                >
                  Clear All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addFilter}
                  className="text-xs"
                >
                  Add Filter
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {filters.map((filter, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center space-x-2 p-3 bg-white rounded-md border border-gray-200"
                >
                  {/* Field Selection */}
                  <select
                    value={filter.field}
                    onChange={(e) => updateFilter(index, { field: e.target.value, value: '' })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-[120px]"
                  >
                    {searchableFields.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>

                  {/* Operator Selection */}
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(index, { operator: e.target.value as any })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-[100px]"
                  >
                    {getOperatorOptions(getFieldType(filter.field)).map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>

                  {/* Value Input */}
                  <div className="flex-1">
                    {renderFilterValue(filter, index)}
                  </div>

                  {/* Remove Filter */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFilter(index)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}

              {filters.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No filters applied</p>
                  <p className="text-sm">Click "Add Filter" to start filtering results</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Filter</h3>
            <Input
              type="text"
              placeholder="Enter filter name"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="mb-4"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveDialog(false);
                  setFilterName('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={saveCurrentFilter}
                disabled={!filterName.trim()}
              >
                Save Filter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;