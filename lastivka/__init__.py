"""Ластівка — проактивний privacy-preserving захист прав дитини.

Пайплайн:
  entity + trajectory  -> популяція з прихованим станом і шоками
  emitters             -> силосовані реєстри (окремі SQLite-бази) + шум + access_level
  matching             -> зібрати дитину з силосів (УНЗР; fuzzy де нема)
  detection            -> формули порушень + change-point
  scoring              -> ранжована черга (тріаж)
  validation           -> precision/recall vs ground truth
"""
__version__ = "0.1.0"
