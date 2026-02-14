import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useInventoryStore } from '../hooks/useInventoryStore';
import apiClient from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { RequirePermission } from '../components/auth/RequirePermission';
import SearchIcon from '@mui/icons-material/Search';
import type { Dish, Ingredient, RecipeIngredient } from '../types';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

type DrinkFormValues = {
  name: string;
  description?: string;
  recipe: Array<{
    ingredient: string;
    quantity: number;
  }>;
};

const defaultValues: DrinkFormValues = {
  name: '',
  description: '',
  recipe: [{ ingredient: '', quantity: 1 }]
};

const DrinksPage = () => {
  const { dishes, ingredients, fetchDishes, fetchIngredients, error } = useInventoryStore((state) => ({
    dishes: state.dishes,
    ingredients: state.ingredients,
    fetchDishes: state.fetchDishes,
    fetchIngredients: state.fetchIngredients,
    error: state.error
  }));

  const [open, setOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [selectedDrink, setSelectedDrink] = useState<Dish | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Dish | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting }
  } = useForm<DrinkFormValues>({ defaultValues });

  const { fields, append, remove } = useFieldArray({ control, name: 'recipe' });

  useEffect(() => {
    void fetchIngredients();
    void fetchDishes();
  }, [fetchIngredients, fetchDishes]);

  const beverageIngredients = useMemo(
    () => ingredients.filter((ingredient) => ingredient.category === 'bebida' || ingredient.category === 'cafe'),
    [ingredients]
  );

  const ingredientOptions = useMemo(
    () =>
      beverageIngredients.map((ingredient) => ({
        label: ingredient.name,
        value: ingredient._id
      })),
    [beverageIngredients]
  );

  const drinks = useMemo(() => dishes.filter((dish) => dish.type === 'drink'), [dishes]);
  const filteredDrinks = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) return drinks;
    return drinks.filter((drink) => {
      const nameMatch = drink.name.toLowerCase().includes(normalizedTerm);
      const descriptionMatch = drink.description?.toLowerCase().includes(normalizedTerm) ?? false;
      return nameMatch || descriptionMatch;
    });
  }, [drinks, searchTerm]);

  const watchedRecipe = watch('recipe');

  const handleOpen = () => {
    setDialogMode('create');
    setSelectedDrink(null);
    reset(defaultValues);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedDrink(null);
  };

  const resolveIngredient = (ingredientRef: RecipeIngredient['ingredient']): Ingredient | undefined => {
    if (typeof ingredientRef === 'object' && ingredientRef !== null) {
      return ingredientRef as Ingredient;
    }
    return ingredients.find((ingredient) => ingredient._id === ingredientRef);
  };

  const pluralize = (word: string, quantity: number) => {
    const trimmed = word.trim();
    if (!trimmed) return quantity === 1 ? 'unidad' : 'unidades';
    if (quantity === 1) return trimmed;
    const lower = trimmed.toLowerCase();
    if (lower.endsWith('s')) return trimmed;
    if (lower.endsWith('z')) return `${trimmed.slice(0, -1)}ces`;
    if (/[aeiouáéíóú]$/i.test(lower)) return `${trimmed}s`;
    return `${trimmed}es`;
  };

  const formatQuantity = (recipeItem: RecipeIngredient) => {
    const ingredient = resolveIngredient(recipeItem.ingredient);
    const ingredientName = ingredient?.name ?? (typeof recipeItem.ingredient === 'string' ? recipeItem.ingredient : 'Ingrediente');

    if (!ingredient) {
      return `${ingredientName} • ${recipeItem.quantityInGrams} g`;
    }

    // Categorías que tradicionalmente usan gramos
    const bulkCategories = ['condimentos', 'frutas', 'cereales', 'lacteos', 'otros', 'proteinas', 'vegetales'];
    if (bulkCategories.includes(ingredient.category)) {
      return `${ingredientName} • ${recipeItem.quantityInGrams} g`;
    }

    const conversion = ingredient.conversionFactorToGrams && ingredient.conversionFactorToGrams > 0 ? ingredient.conversionFactorToGrams : 1;
    const quantityInUnits = recipeItem.quantityInGrams / conversion;
    const formattedQuantity = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: Number.isInteger(quantityInUnits) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(quantityInUnits);
    const rawUnit = ingredient.stockUnit ?? ingredient.productUnit?.trim();
    const unitMatch = rawUnit?.match(/^([^(]+?)(?:\((.+)\))?$/);
    const baseUnit = unitMatch?.[1]?.trim() || 'unidad';
    const detail = unitMatch?.[2]?.trim();
    const baseLabel = pluralize(baseUnit, Number(quantityInUnits.toFixed(2)));
    const detailText = detail ? ` de ${detail}` : '';

    return `${ingredientName} • ${formattedQuantity} ${baseLabel}${detailText}`;
  };

  const onSubmit = handleSubmit(async (values) => {
    const recipe = values.recipe
      .filter((item) => item.ingredient && item.quantity > 0)
      .map((item) => {
        const ingredient = beverageIngredients.find((candidate) => candidate._id === item.ingredient);
        const conversion = ingredient?.conversionFactorToGrams || 1;
        const quantityInGrams = Number((item.quantity || 0) * conversion);

        return {
          ingredient: item.ingredient,
          quantityInGrams
        };
      });

    const payload = {
      name: values.name,
      description: values.description,
      recipe,
      type: 'drink'
    };

    if (dialogMode === 'edit' && selectedDrink) {
      await apiClient.put(`/dishes/${selectedDrink._id}`, payload);
    } else {
      await apiClient.post<Dish>('/dishes', payload);
    }

    setOpen(false);
    setSelectedDrink(null);
    await fetchDishes();
  });

  const toDrinkFormValues = (drink: Dish): DrinkFormValues => {
    const recipe =
      drink.recipe && drink.recipe.length > 0
        ? drink.recipe.map((item) => {
            const ingredientId =
              typeof item.ingredient === 'string' ? item.ingredient : item.ingredient?._id ?? '';
            const ingredientDoc = ingredients.find((candidate) => candidate._id === ingredientId);
            const conversion =
              ingredientDoc && ingredientDoc.conversionFactorToGrams && ingredientDoc.conversionFactorToGrams > 0
                ? ingredientDoc.conversionFactorToGrams
                : 1;
            // Categorías que tradicionalmente usan gramos
            const bulkCategories = ['condimentos', 'frutas', 'cereales', 'lacteos', 'otros', 'proteinas', 'vegetales'];
            const isIngredientCategory = ingredientDoc && bulkCategories.includes(ingredientDoc.category);
            let quantity = isIngredientCategory ? item.quantityInGrams : item.quantityInGrams / conversion;
            if (!isIngredientCategory) {
              quantity = Number(quantity.toFixed(2));
            }
            return {
              ingredient: ingredientId,
              quantity
            };
          })
        : [{ ingredient: '', quantity: 1 }];

    return {
      name: drink.name,
      description: drink.description ?? '',
      recipe
    };
  };

  const handleEdit = (drink: Dish) => {
    setDialogMode('edit');
    setSelectedDrink(drink);
    reset(toDrinkFormValues(drink));
    setOpen(true);
  };

  const handleDuplicate = (drink: Dish) => {
    setDialogMode('duplicate');
    setSelectedDrink(drink);
    const mapped = toDrinkFormValues(drink);
    reset({
      ...mapped,
      name: `${mapped.name} (copia)`
    });
    setOpen(true);
  };

  const handleDelete = (drink: Dish) => {
    setConfirmDelete(drink);
  };

  const confirmDeleteDrink = async () => {
    if (!confirmDelete) return;
    await apiClient.delete(`/dishes/${confirmDelete._id}`);
    setConfirmDelete(null);
    await fetchDishes();
  };

  const dialogTitle =
    dialogMode === 'edit'
      ? 'Editar bebida'
      : dialogMode === 'duplicate'
      ? 'Duplicar bebida'
      : 'Nueva bebida';

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Bebidas y café</Typography>
          <RequirePermission resource="recipes" action="create" hide>
            <Button variant="contained" onClick={handleOpen}>
              Nueva bebida
            </Button>
          </RequirePermission>
        </Stack>
      </Grid>

      {error && (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      )}

      <Grid item xs={12}>
        <TextField
          fullWidth
          placeholder="Buscar bebidas"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
      </Grid>

      {filteredDrinks.map((drink) => (
        <Grid item xs={12} md={6} key={drink._id}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">{drink.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {drink.description}
              </Typography>
              {drink.recipe.length > 0 ? (
                <Stack spacing={0.5}>
                  {drink.recipe.map((item) => (
                    <Typography key={`${drink._id}-${typeof item.ingredient === 'object' ? item.ingredient?._id : item.ingredient}`} variant="body2">
                      {formatQuantity(item)}
                    </Typography>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Sin ingredientes asociados.
                </Typography>
              )}
              <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                <RequirePermission resource="recipes" action="update" hide>
                  <Button
                    size="small"
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={() => handleEdit(drink)}
                  >
                    Editar
                  </Button>
                </RequirePermission>
                <RequirePermission resource="recipes" action="create" hide>
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon fontSize="small" />}
                    onClick={() => handleDuplicate(drink)}
                  >
                    Duplicar
                  </Button>
                </RequirePermission>
                <RequirePermission resource="recipes" action="delete" hide>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineIcon fontSize="small" />}
                    onClick={() => handleDelete(drink)}
                  >
                    Eliminar
                  </Button>
                </RequirePermission>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Controller
              control={control}
              name="name"
              rules={{ required: true }}
              render={({ field }) => <TextField label="Nombre" {...field} />}
            />
            <Controller
              control={control}
              name="description"
              render={({ field }) => <TextField label="Descripción" {...field} multiline minRows={2} />}
            />

            <Typography variant="subtitle1">Ingredientes</Typography>
            <Stack spacing={2}>
              {fields.map((field, index) => {
                const selectedIngredientId = watchedRecipe?.[index]?.ingredient;
                const selectedIngredient = beverageIngredients.find((ingredient) => ingredient._id === selectedIngredientId);
                const rawUnit = selectedIngredient?.stockUnit ?? selectedIngredient?.productUnit?.trim();
                const cleanedUnit =
                  rawUnit && rawUnit.includes('(') && rawUnit.includes(')')
                    ? rawUnit.replace(/\s*\(.*\)\s*/g, '').trim()
                    : rawUnit;
                // Categorías que tradicionalmente usan gramos
                const bulkCategories = ['condimentos', 'frutas', 'cereales', 'lacteos', 'otros', 'proteinas', 'vegetales'];
                const isBulkCategory = selectedIngredient && bulkCategories.includes(selectedIngredient.category);
                const unitLabel =
                  isBulkCategory
                    ? 'g'
                    : cleanedUnit && cleanedUnit.length > 0
                    ? cleanedUnit
                    : 'unidades';

                return (
                  <Stack key={field.id} direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                    <Controller
                      control={control}
                      name={`recipe.${index}.ingredient`}
                      rules={{ required: true }}
                      render={({ field: ingredientField }) => (
                        <Autocomplete
                          sx={{ minWidth: 220 }}
                          options={ingredientOptions}
                          getOptionLabel={(option) => option.label}
                          value={ingredientOptions.find((option) => option.value === ingredientField.value) ?? null}
                          onChange={(_, value) => ingredientField.onChange(value?.value ?? '')}
                          isOptionEqualToValue={(option, value) => option.value === value.value}
                          renderInput={(params) => <TextField {...params} label="Ingrediente" />}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name={`recipe.${index}.quantity`}
                      rules={{ required: true, min: 0.01 }}
                      render={({ field: quantityField }) => (
                        <TextField
                          label={`Cantidad (${unitLabel})`}
                          type="number"
                          value={quantityField.value}
                          onChange={(event) => quantityField.onChange(Number(event.target.value))}
                          inputProps={{ min: 0.01, step: 0.01 }}
                        />
                      )}
                    />
                    <Button color="error" onClick={() => remove(index)}>
                      Eliminar
                    </Button>
                  </Stack>
                );
              })}
              <Button onClick={() => append({ ingredient: '', quantity: 1 })}>Agregar ingrediente</Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={onSubmit} variant="contained" disabled={isSubmitting}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que deseas eliminar la bebida "{confirmDelete?.name}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteDrink}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default DrinksPage;


