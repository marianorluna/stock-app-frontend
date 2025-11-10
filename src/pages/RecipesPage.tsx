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
import SearchIcon from '@mui/icons-material/Search';
import type { Dish } from '../types';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

type RecipeFormValues = {
  name: string;
  description?: string;
  recipe: Array<{
    ingredient: string;
    quantityInGrams: number;
  }>;
};

const defaultValues: RecipeFormValues = {
  name: '',
  description: '',
  recipe: [{ ingredient: '', quantityInGrams: 0 }]
};

const RecipesPage = () => {
  const { dishes, ingredients, fetchDishes, fetchIngredients, error } = useInventoryStore((state) => ({
    dishes: state.dishes,
    ingredients: state.ingredients,
    fetchDishes: state.fetchDishes,
    fetchIngredients: state.fetchIngredients,
    error: state.error
  }));
  const [open, setOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Dish | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm<RecipeFormValues>({ defaultValues });

  const { fields, append, remove } = useFieldArray({ control, name: 'recipe' });
  const [searchTerm, setSearchTerm] = useState('');
  const recipes = useMemo(() => dishes.filter((dish) => dish.type !== 'drink'), [dishes]);
  const filteredRecipes = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) return recipes;
    return recipes.filter((dish) => {
      const nameMatch = dish.name.toLowerCase().includes(normalizedTerm);
      const descriptionMatch = dish.description?.toLowerCase().includes(normalizedTerm) ?? false;
      return nameMatch || descriptionMatch;
    });
  }, [recipes, searchTerm]);

  useEffect(() => {
    void fetchIngredients();
    void fetchDishes();
  }, [fetchIngredients, fetchDishes]);

  const ingredientOptions = useMemo(
    () =>
      ingredients.map((ingredient) => ({
        label: ingredient.name,
        value: ingredient._id
      })),
    [ingredients]
  );

  const mapDishToFormValues = (dish: Dish): RecipeFormValues => {
    const recipe =
      dish.recipe && dish.recipe.length > 0
        ? dish.recipe.map((item) => ({
            ingredient: typeof item.ingredient === 'string' ? item.ingredient : item.ingredient?._id ?? '',
            quantityInGrams: item.quantityInGrams ?? 0
          }))
        : [{ ingredient: '', quantityInGrams: 0 }];
    return {
      name: dish.name,
      description: dish.description ?? '',
      recipe
    };
  };

  const handleOpen = () => {
    setDialogMode('create');
    setSelectedDish(null);
    reset(defaultValues);
    setOpen(true);
  };

  const handleEdit = (dish: Dish) => {
    setDialogMode('edit');
    setSelectedDish(dish);
    reset(mapDishToFormValues(dish));
    setOpen(true);
  };

  const handleDuplicate = (dish: Dish) => {
    setDialogMode('duplicate');
    setSelectedDish(dish);
    const mapped = mapDishToFormValues(dish);
    reset({
      ...mapped,
      name: `${mapped.name} (copia)`
    });
    setOpen(true);
  };

  const handleDelete = (dish: Dish) => {
    setConfirmDelete(dish);
  };

  const confirmDeleteDish = async () => {
    if (!confirmDelete) return;
    await apiClient.delete(`/dishes/${confirmDelete._id}`);
    setConfirmDelete(null);
    await fetchDishes();
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedDish(null);
  };

  const onSubmit = handleSubmit(async (values) => {
    const recipe = values.recipe
      .filter((item) => item.ingredient && item.quantityInGrams > 0)
      .map((item) => ({
        ingredient: item.ingredient,
        quantityInGrams: item.quantityInGrams
      }));

    const payload = {
      name: values.name,
      description: values.description,
      recipe
    };

    if (dialogMode === 'edit' && selectedDish) {
      await apiClient.put(`/dishes/${selectedDish._id}`, payload);
    } else {
      await apiClient.post<Dish>('/dishes', payload);
    }
    setOpen(false);
    setSelectedDish(null);
    await fetchDishes();
  });

  const dialogTitle =
    dialogMode === 'edit'
      ? 'Editar receta'
      : dialogMode === 'duplicate'
      ? 'Duplicar receta'
      : 'Nueva receta';

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Recetas</Typography>
          <Button variant="contained" onClick={handleOpen}>
            Nueva receta
          </Button>
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
          placeholder="Buscar recetas"
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

      {filteredRecipes.map((dish) => (
        <Grid item xs={12} md={6} key={dish._id}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">{dish.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {dish.description}
              </Typography>
              <Stack spacing={0.5}>
                {dish.recipe.map((item) => {
                  const ingredientRef = item.ingredient;
                  const ingredientId =
                    typeof ingredientRef === 'string' ? ingredientRef : ingredientRef?._id ?? '';
                  const ingredientName =
                    typeof ingredientRef === 'object' && ingredientRef !== null
                      ? ingredientRef.name
                      : ingredients.find((ingredient) => ingredient._id === ingredientId)?.name ?? ingredientId;

                  return (
                    <Typography key={`${dish._id}-${ingredientId}`} variant="body2">
                      {ingredientName} • {item.quantityInGrams} g
                    </Typography>
                  );
                })}
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                <Button
                  size="small"
                  startIcon={<EditOutlinedIcon fontSize="small" />}
                  onClick={() => handleEdit(dish)}
                >
                  Editar
                </Button>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  onClick={() => handleDuplicate(dish)}
                >
                  Duplicar
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteOutlineIcon fontSize="small" />}
                  onClick={() => handleDelete(dish)}
                >
                  Eliminar
                </Button>
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
              {fields.map((field, index) => (
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
                    name={`recipe.${index}.quantityInGrams`}
                    rules={{ required: true, min: 1 }}
                render={({ field }) => (
                  <TextField
                    label="Cantidad (g)"
                    type="number"
                    value={field.value}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                )}
                  />
                  <Button color="error" onClick={() => remove(index)}>
                    Eliminar
                  </Button>
                </Stack>
              ))}
              <Button onClick={() => append({ ingredient: '', quantityInGrams: 0 })}>Agregar ingrediente</Button>
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
          <Typography>¿Estás seguro de que deseas eliminar la receta "{confirmDelete?.name}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteDish}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default RecipesPage;

