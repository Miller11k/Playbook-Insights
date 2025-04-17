import math
import pandas as pd
from typing import Optional, Any

def clean_date_field(value: Any) -> Optional[str]:
    """
    Cleans a date field and converts it to a string in 'YYYY-MM-DD' format if valid; otherwise returns None.
    
    Args:
        value: The input date value.
        
    Returns:
        A string representing the date in 'YYYY-MM-DD' format or None if invalid.
    """
    if pd.isna(value):
        return None
    return pd.to_datetime(value).date().isoformat()

def clean_optional_int(value: Any) -> Optional[int]:
    """
    Cleans a value to return an integer if possible; otherwise returns None.
    
    Args:
        value: The input value.
        
    Returns:
        An integer or None.
    """
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)):
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None

def clean_optional_float(value: Any) -> Optional[float]:
    """
    Cleans a value to return a float if possible; otherwise returns None.
    
    Args:
        value: The input value.
        
    Returns:
        A float or None.
    """
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)):
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def clean_optional_str(value: Any) -> Optional[str]:
    """
    Cleans a value to return a string if possible; otherwise returns None.
    
    Args:
        value: The input value.
        
    Returns:
        A string or None.
    """
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)):
        return None
    return str(value)